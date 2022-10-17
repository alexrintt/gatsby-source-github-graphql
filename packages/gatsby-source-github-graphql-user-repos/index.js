async function getAllRepositoryTopics({ graphql, repo, owner }) {
  const context = { cursor: null, repoTopics: [] };

  while (true) {
    const {
      repository: {
        repositoryTopics: { pageInfo, nodes: repositoryTopics },
      },
    } = await graphql(
      `
        query GetAllRepositoryTopics(
          $owner: String!
          $repo: String!
          $cursor: String
          $perPage: Int!
        ) {
          repository(owner: $owner, name: $repo) {
            id
            repositoryTopics(after: $cursor, first: $perPage) {
              pageInfo {
                endCursor
                hasNextPage
              }
              nodes {
                id
                resourcePath
                url
                topic {
                  id
                  name
                  stargazerCount
                  viewerHasStarred
                }
              }
            }
          }
        }
      `,
      {
        owner: owner,
        repo: repo,
        cursor: context.cursor,
        perPage: 100,
      }
    );

    context.cursor = pageInfo.endCursor;

    context.repoTopics.push(...repositoryTopics);

    if (!pageInfo.hasNextPage) break;
  }

  return context.repoTopics;
}

async function getAllReposOfUser({
  githubPlainResolverFields,
  login,
  graphql,
  affiliations,
  ownerAffiliations,
  privacy,
  isLocked,
  isFork,
  limit,
}) {
  const context = { cursor: null, repositories: [], user: null };

  const hasLimit = typeof limit === "number";

  const perPage = hasLimit ? Math.max(Math.min(limit, 100), 0) : 100;

  while (true) {
    const {
      user: {
        repositories: { nodes: repositories, pageInfo },
      },
      user,
    } = await graphql(
      `
        query GetUserRepositories(
          $login: String!
          $perPage: Int!
          $cursor: String
          $affiliations: [RepositoryAffiliation]
          $ownerAffiliations: [RepositoryAffiliation]
          $isLocked: Boolean
          $isFork: Boolean
          $privacy: RepositoryPrivacy
        ) {
          user(login: $login) {
            ${githubPlainResolverFields.USER}
            repositories(
              after: $cursor, 
              first: $perPage, 
              affiliations: $affiliations
              ownerAffiliations: $ownerAffiliations
              privacy: $privacy
              isLocked: $isLocked
              isFork: $isFork
            ) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                __typename
                name
                nameWithOwner
                homepageUrl
                hasWikiEnabled
                isArchived
                isDisabled
                isEmpty
                isFork
                isInOrganization
                isLocked
                isMirror
                isPrivate
                isSecurityPolicyEnabled
                isTemplate
                openGraphImageUrl
                visibility
                viewerHasStarred
                autoMergeAllowed
                allowUpdateBranch
                createdAt
                contactLinks {
                  about
                  name
                  url
                }
                viewerPermission
                url
                updatedAt
                stargazerCount
                sshUrl
                shortDescriptionHTML
                description
                descriptionHTML
                pushedAt
                owner {
                  login
                }
                primaryLanguage {
                  color
                  id
                  name
                }
              }
            }
          }
        }
      `,
      {
        login,
        perPage: perPage,
        cursor: context.cursor,
        affiliations,
        ownerAffiliations,
        privacy,
        isLocked,
        isFork,
      }
    );

    context.cursor = pageInfo.endCursor;
    context.user = user;
    context.repositories.push(...repositories);

    const reachedLimit = hasLimit && context.repositories.length >= limit;

    if (reachedLimit || !pageInfo.hasNextPage) break;
  }

  return {
    user: context.user,
    repositories: await Promise.all(
      context.repositories.map(async (repository) => ({
        ...repository,
        repositoryTopics: await getAllRepositoryTopics({
          graphql,
          owner: repository.owner.login,
          repo: repository.name,
        }),
      }))
    ),
  };
}

module.exports = async (
  { graphql, githubPlainResolverFields },
  pluginOptions
) => {
  pluginOptions = pluginOptions ?? {};

  const {
    login,
    affiliations: customAffiliations,
    ownerAffiliations: customOwnerAffiliations,
    privacy: customPrivacy,
    isLocked: customIsLocked,
    isFork: customIsFork,
    pluginNodeTypes,
    limit,
  } = pluginOptions;

  const affiliations = customAffiliations;
  const ownerAffiliations = customOwnerAffiliations;
  const privacy = customPrivacy;
  const isLocked = customIsLocked;
  const isFork = customIsFork;

  const { user, repositories } = await getAllReposOfUser({
    githubPlainResolverFields,
    login,
    graphql,
    affiliations,
    ownerAffiliations,
    privacy,
    isLocked,
    isFork,
    limit,
  });

  const repositoryTopics = repositories
    .map((r) => r.repositoryTopics)
    .reduce((previous, current) => [...previous, ...current], []);

  const topics = repositoryTopics.map((rp) => rp.topic);

  return {
    [pluginNodeTypes.USER]: [user],
    [pluginNodeTypes.REPOSITORY]: [...repositories],
    [pluginNodeTypes.REPOSITORY_TOPIC]: [...repositoryTopics],
    [pluginNodeTypes.TOPIC]: [...topics],
  };
};

module.exports.createSchemaCustomization = (
  { actions: { createTypes } },
  pluginOptions
) => {
  const { pluginNodeTypes } = pluginOptions;

  const typedefs = `
    type ${pluginNodeTypes.USER} implements Node {
      repositories: [${pluginNodeTypes.REPOSITORY}] @link(by: "owner.login", from: "login")
    }
    type ${pluginNodeTypes.REPOSITORY} implements Node {
      owner: ${pluginNodeTypes.USER} @link(from: "owner.login", by: "login")
      repositoryTopics: [${pluginNodeTypes.REPOSITORY_TOPIC}] @link(from: "repositoryTopics.id", by: "githubId")
      topics: [${pluginNodeTypes.TOPIC}] @link(from: "repositoryTopics.topic.id", by: "githubId")
    }
    type ${pluginNodeTypes.REPOSITORY_TOPIC} implements Node {
      repositories: [${pluginNodeTypes.REPOSITORY_TOPIC}] @link(from: "githubId", by: "repositoryTopics.id")
    }
    type ${pluginNodeTypes.TOPIC} implements Node {
      repositories: [${pluginNodeTypes.REPOSITORY_TOPIC}] @link(from: "githubId", by: "repositoryTopics.topic.id")
    }
  `;

  createTypes(typedefs);
};
