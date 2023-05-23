const MAX_RESULTS = 100;

async function listDiscussionsOfRepo(
  owner,
  repo,
  {
    cursor,
    categoryId,
    perPage,
    orderByField,
    orderByDirection,
    graphql,
    githubPlainResolverFields,
  }
) {
  const data = graphql(
    `
      query ListDiscussionsOfRepo(
        $owner: String!
        $name: String!
        $after: String
        $first: Int!
        $categoryId: ID
        $orderBy: DiscussionOrder!
      ) {
        repository(owner: $owner, name: $name) {
          discussions(
            categoryId: $categoryId
            after: $after
            first: $first
            orderBy: $orderBy
          ) {
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              ${githubPlainResolverFields.DISCUSSION}
              category {
                ${githubPlainResolverFields.DISCUSSION_CATEGORY}
              }
              labels(
                first: 100
                orderBy: { field: CREATED_AT, direction: DESC }
              ) {
                nodes {
                  ${githubPlainResolverFields.LABEL}
                }
              }
              author {
                ... on User {
                  ${githubPlainResolverFields.USER}
                }
              }
            }
          }
        }
      }
    `,
    {
      owner,
      name: repo,
      after: cursor,
      categoryId,
      first: perPage,
      orderBy: {
        field: orderByField,
        direction: orderByDirection,
      },
    }
  );
  return data;
}
exports.listDiscussionsOfRepo = listDiscussionsOfRepo;

async function fetchDiscussions(
  owner,
  repo,
  {
    categoryId,
    categorySlug,
    resultsLimit,
    orderByDirection,
    orderByField,
    graphql,
    githubPlainResolverFields,
  }
) {
  const context = { discussions: [], cursor: null };

  const getCategoryIdFromSlug = () =>
    typeof categorySlug === "string"
      ? getDiscussionCategoryId(owner, repo, {
          categorySlug,
          graphql,
        })
      : null;

  categoryId = categoryId ?? (await getCategoryIdFromSlug());

  while (true) {
    const {
      repository: {
        discussions: {
          pageInfo: { hasNextPage, endCursor },
          nodes: discussions,
        },
      },
    } = await getDiscussions(owner, repo, {
      categoryId,
      cursor: context.cursor,
      resultsLimit,
      orderByDirection,
      orderByField,
      graphql,
      githubPlainResolverFields,
    });

    context.discussions = [
      ...context.discussions,
      ...discussions.map((d) => ({
        ...d,
        labels: d.labels.nodes.map((e) => e),
      })),
    ];

    context.cursor = endCursor;

    const reachedLimit =
      typeof resultsLimit === "number" &&
      context.discussions.length >= resultsLimit;

    if (!hasNextPage || reachedLimit) break;
  }

  return context.discussions;
}
exports.fetchDiscussions = fetchDiscussions;

async function getDiscussionCategoryId(owner, repo, { categorySlug, graphql }) {
  const {
    repository: {
      discussionCategory: { id },
    },
  } = await graphql(
    `
      query GetRepoDiscussionCategoryId(
        $owner: String!
        $name: String!
        $slug: String!
      ) {
        repository(owner: $owner, name: $name) {
          discussionCategory(slug: $slug) {
            id
          }
        }
      }
    `,
    {
      owner,
      name: repo,
      slug: categorySlug,
    }
  );
  return id;
}
exports.getDiscussionCategoryId = getDiscussionCategoryId;

async function getDiscussions(
  owner,
  repo,
  {
    categoryId,
    cursor,
    resultsLimit,
    orderByDirection,
    orderByField,
    graphql,
    githubPlainResolverFields,
  }
) {
  return await listDiscussionsOfRepo(owner, repo, {
    categoryId,
    cursor,
    perPage: Math.max(1, Math.min(MAX_RESULTS, resultsLimit ?? MAX_RESULTS)),
    orderByDirection,
    orderByField,
    graphql,
    githubPlainResolverFields,
  });
}
exports.getDiscussions = getDiscussions;
