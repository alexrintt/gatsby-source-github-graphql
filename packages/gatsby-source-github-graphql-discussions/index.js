const { fetchDiscussions } = require("./discussions")

async function getRepositoryDiscussions({
  owner,
  repo,
  categoryIds,
  categorySlugs,
  maxDiscussionsCount,
  orderByDirection,
  orderByField,
  graphql,
  githubApiTypes,
  pluginFragments,
  githubPlainResolverFields,
}) {
  const fetchOnceWithoutFilters = [{}]

  const compareField =
    orderByField === githubApiTypes.DISCUSSION_ORDER_FIELD.CREATED_AT
      ? `createdAt`
      : `updatedAt`

  const desc = orderByDirection === githubApiTypes.ORDER_DIRECTION.DESC

  const _ = fn => (a, z) =>
    fn(
      new Date(a[compareField]).getMilliseconds(),
      new Date(z[compareField]).getMilliseconds()
    )

  const compareFn = _((a, z) => (desc ? z - a : a - z))

  const filters =
    categoryIds != null
      ? categoryIds.map(categoryId => ({ categoryId }))
      : categorySlugs != null
      ? categorySlugs.map(categorySlug => ({ categorySlug }))
      : fetchOnceWithoutFilters

  const discussions = (
    await Promise.all(
      filters.map(filter =>
        fetchDiscussions(owner, repo, {
          resultsLimit: maxDiscussionsCount,
          orderByDirection,
          orderByField,
          ...filter,
          graphql,
          pluginFragments,
          githubPlainResolverFields,
        })
      )
    )
  ).reduce((previous, current) => [...previous, ...current], [])
  discussions.sort(compareFn)

  return discussions
}

module.exports = async (
  {
    actions: { createNode },
    createContentDigest,
    createNodeId,
    graphql,
    githubPlainResolverFields,
  },
  pluginOptions
) => {
  pluginOptions = { ...(pluginOptions ?? {}) }

  const { pluginNodeTypes, githubApiTypes } = pluginOptions

  const DEFAULT_OPTIONS = {
    orderByDirection: githubApiTypes.ORDER_DIRECTION.DESC,
    orderByField: githubApiTypes.DISCUSSION_ORDER_FIELD.CREATED_AT,
  }

  const options = Object.assign({}, DEFAULT_OPTIONS, pluginOptions)

  const { mapDiscussions } = options

  const discussions = await getRepositoryDiscussions({
    ...options,
    graphql,
    githubPlainResolverFields,
  })

  const mappedDiscussions = discussions.map(discussion =>
    (mapDiscussions ?? (_ => _))(discussion)
  )

  return {
    [pluginNodeTypes.DISCUSSION]: mappedDiscussions,
    [pluginNodeTypes.LABEL]: mappedDiscussions
      .map(discussion => discussion.labels)
      .reduce((previous, current) => [...previous, ...current], []),
    [pluginNodeTypes.USER]: mappedDiscussions.map(
      discussion => discussion.author
    ),
    [pluginNodeTypes.DISCUSSION_CATEGORY]: mappedDiscussions.map(
      discussion => discussion.category
    ),
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
      discussions: [${pluginNodeTypes.DISCUSSION}] @link(by: "author.id", from: "githubId")
    }
    type ${pluginNodeTypes.DISCUSSION} implements Node {
      author: ${pluginNodeTypes.USER} @link(from: "author.id", by: "githubId")
      labels: [${pluginNodeTypes.LABEL}] @link(from: "labels.id", by: "githubId")
      category: ${pluginNodeTypes.DISCUSSION_CATEGORY} @link(from: "category.id", by: "githubId")
    }
    type ${pluginNodeTypes.DISCUSSION_CATEGORY} implements Node {
      discussions: [${pluginNodeTypes.DISCUSSION}] @link(by: "category.id", from: "githubId")
    }
  `
  createTypes(typeDefs)
}
