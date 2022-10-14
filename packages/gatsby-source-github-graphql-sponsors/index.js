async function fetchUserSponsorNetwork({
  graphql,
  login,
  githubPlainResolverFields,
}) {
  const sponsorsContext = {
    data: [],
    cursor: null,
    hasNextPage: true,
  }
  const sponsoringContext = {
    data: [],
    cursor: null,
    hasNextPage: true,
  }

  while (true) {
    const {
      user: { sponsoring, sponsors },
    } = await graphql(
      `
        query GetUserSponsorNetwork (
          $login: String!
          $sponsorsCursor: String
          $sponsorsCount: Int
          $sponsoringCursor: String
          $sponsoringCount: Int
        ) { 
          user(login: $login) {
            sponsoring(
              after: $sponsoringCursor
              first: $sponsoringCount
            ) {
              pageInfo {
                endCursor
                hasNextPage
              }
              nodes {
                __typename
                ... on User {
                  ${githubPlainResolverFields.USER}
                }
              }
            }
            sponsors(
              after: $sponsorsCursor
              first: $sponsorsCount
            ) {
              pageInfo {
                endCursor
                hasNextPage
              }
              nodes {
                __typename
                ... on User {
                  ${githubPlainResolverFields.USER}
                }
              }
            }
          }
        }
      `,
      {
        login,
        sponsorsCursor: sponsorsContext.hasNextPage
          ? sponsorsContext.cursor
          : null,
        sponsorsCount: sponsorsContext.hasNextPage ? 100 : 0,
        sponsoringCursor: sponsoringContext.hasNextPage
          ? sponsoringContext.cursor
          : null,
        sponsoringCount: sponsoringContext.hasNextPage ? 100 : 0,
      }
    )

    sponsorsContext.data.push(...sponsors.nodes)
    sponsoringContext.data.push(...sponsoring.nodes)

    sponsorsContext.hasNextPage = sponsors.pageInfo.hasNextPage
    sponsoringContext.hasNextPage = sponsoring.pageInfo.hasNextPage

    if (!sponsorsContext.hasNextPage && !sponsoringContext.hasNextPage) break
  }

  return {
    sponsors: sponsorsContext.data,
    sponsoring: sponsoringContext.data,
  }
}

module.exports = async (
  { graphql, githubPlainResolverFields },
  pluginOptions
) => {
  const { pluginNodeTypes, login } = pluginOptions

  const { user } = await graphql(
    `
      query GetUser($login: String!) {
        user(login: $login) {
          ${githubPlainResolverFields.USER}
        } 
      }
    `,
    {
      login,
    }
  )

  const { sponsors, sponsoring } = await fetchUserSponsorNetwork({
    graphql,
    login,
    githubPlainResolverFields,
  })

  return {
    [pluginNodeTypes.USER]: [
      { ...user, sponsors, sponsoring },
      ...sponsors,
      ...sponsoring,
    ],
  }
}

module.exports.onCreateNode = async (
  { node, isInternalType, createFileNodeFrom },
  { pluginNodeTypes }
) => {
  if (!isInternalType) return
}

module.exports.createSchemaCustomization = (
  { actions },
  { pluginNodeTypes }
) => {
  const { createTypes } = actions

  const typeDefs = `
    type ${pluginNodeTypes.USER} implements Node {
      sponsors: [${pluginNodeTypes.USER}] @link(by: "githubId", from: "sponsors.id")
      sponsoring: [${pluginNodeTypes.USER}] @link(by: "githubId", from: "sponsoring.id")
    }
  `
  createTypes(typeDefs)
}
