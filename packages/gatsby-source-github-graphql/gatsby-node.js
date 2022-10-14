const githubOctokit = require(`./github-octokit`);
const { mergeDeep } = require(`./utils`);
const { getGithubPlainResolverFields } = require(`./plugin-github-fragments`);

const { createRemoteFileNode } = require(`gatsby-source-filesystem`);
const {
  getPluginNodeTypes,
  getGithubApiTypes,
} = require("./github-graphql-defs");
const { MEDIA_TYPES } = require(`./media-types`);

exports.onPreInit = () => {};

exports.sourceNodes = async (...args) => {
  const [
    {
      actions: { createNode },
      createContentDigest,
      createNodeId,
      getNodesByType,
    },
    userPluginOptions,
  ] = args;

  const pluginOptions = userPluginOptions ?? {};

  const { token, pluginNodeTypes: userPluginNodeTypes } = pluginOptions;

  const rawSubpluginsData = [];

  const githubApiTypes = getGithubApiTypes();
  const pluginNodeTypes = getPluginNodeTypes(userPluginNodeTypes);
  const githubPlainResolverFields = getGithubPlainResolverFields({
    pluginNodeTypes,
  });

  for (const plugin of pluginOptions.plugins ?? []) {
    const resolvedPlugin = plugin.module;

    const subpluginOptions = plugin.pluginOptions ?? {};

    // Allow all plugins to have a custom token implicitely.
    const { token: customToken } = subpluginOptions;

    delete pluginOptions.token;

    const graphql = githubOctokit.createGraphQLWithAuth(customToken ?? token);

    const subpluginArgs = [
      { ...args[0], graphql, githubPlainResolverFields },
      { ...subpluginOptions, githubApiTypes, pluginNodeTypes },
      ...args.slice(2),
    ];

    const pluginData = await resolvedPlugin(...subpluginArgs);

    // Plugins that doesn't return anything probably created
    // the nodes by their own, so just skip it.
    if (typeof pluginData === `undefined`) continue;

    for (const k in pluginData) {
      pluginData[k] = pluginData[k].map((data) => ({
        ...data,
        // Track each node instance by plugin.
        // This way we can filter the nodes by the source plugin.
        // This is required since we can fetch multiple repositories
        // for different purposes.
        meta: {
          plugin: plugin.name,
          source: subpluginOptions.source,
        },
      }));
    }

    // Otherwise they want we to create the nodes for them.
    rawSubpluginsData.push(pluginData);
  }

  const dataByType = {};

  for (const pluginData of rawSubpluginsData) {
    for (const k in pluginData) {
      dataByType[k] = [...(dataByType[k] ?? []), ...(pluginData[k] ?? [])];
    }
  }

  if (typeof pluginOptions?.createCustomMapper === `function`) {
    const customMapper = pluginOptions.createCustomMapper({ pluginNodeTypes });

    for (const type of Object.values(pluginNodeTypes)) {
      const mapper = customMapper[type];

      if (typeof mapper !== `function`) continue;

      dataByType[type] = dataByType[type].map(mapper);
    }
  }

  /** [dataByType]:
   * {
   *   [pluginNodeTypes.USER]: [{ ...GitHubGraphQLUserType }, { ...GitHubGraphQLUserType }],
   *   [pluginNodeTypes.REPOSITORY]: [... /** Same as above *\/],
   *   ...
   * }
   */
  for (const type in dataByType) {
    // we do not recognize this node type, skip it.
    if (!Object.values(pluginNodeTypes).includes(type)) continue;

    const items = dataByType[type] ?? [];

    function getMediaType(nodeType) {
      switch (nodeType) {
        case pluginNodeTypes.DISCUSSION:
        case pluginNodeTypes.ISSUE:
          return MEDIA_TYPES.MARKDOWN;
        default:
          return undefined;
      }
    }

    function getNodeContent(node, type) {
      switch (type) {
        case pluginNodeTypes.DISCUSSION:
        case pluginNodeTypes.ISSUE:
          return node.body;
        default:
          return undefined;
      }
    }

    const mediaType = getMediaType(type);

    for (const item of items) {
      const content = getNodeContent(item, type);

      await createNode({
        ...item,
        githubId: item.id,
        id: createNodeId(`${type} >>> ${item.id}`),
        parent: null,
        children: [],
        internal: {
          type: type,
          contentDigest: createContentDigest(item),
          content: content,
          mediaType: mediaType,
        },
      });
    }
  }
};

exports.onCreateNode = async (...args) => {
  const [
    {
      node,
      actions: { createNode, createNodeField },
      createNodeId,
      getCache,
    },
    pluginOptions,
  ] = args;

  const pluginNodeTypes = getPluginNodeTypes(pluginOptions.pluginNodeTypes);

  const internalTypes = [...Object.values(pluginNodeTypes)];

  const checkIfIsInternalType = (type) => internalTypes.includes(type);

  const isInternalType = checkIfIsInternalType(node.internal.type);

  async function createFileNodeFrom({ node, key, fieldName } = {}) {
    if (typeof node[key] !== `string`) return;
    if (!node[key].startsWith(`http`)) return;

    const fileNode = await createRemoteFileNode({
      url: node[key],
      parentNodeId: node.id,
      createNode,
      createNodeId,
      getCache,
    });

    if (fileNode) {
      createNodeField({ node, name: fieldName ?? key, value: fileNode.id });
    }
  }

  const subpluginArgs = [
    args[0],
    {
      ...args[1],
      createFileNodeFrom,
      checkIfIsInternalType,
      isInternalType,
    },
    args.slice(2),
  ];

  // Allow subplugins make use of `onCreateNode` APIs.
  for (const plugin of pluginOptions.plugins) {
    const resolvedPlugin = plugin.module;
    const onCreateNode = resolvedPlugin.onCreateNode;

    if (typeof onCreateNode === `function`) {
      onCreateNode(...subpluginArgs);
    }
  }

  // Allow end-users make use of `onCreateNode` APIs.
  if (typeof pluginOptions?.onCreateNode === `function`) {
    pluginOptions.onCreateNode(...subpluginArgs);
  }

  if (!isInternalType) return;

  if (node.internal.type === pluginNodeTypes.USER) {
    if (pluginOptions.generateOptimizedGitHubUserAvatarUrl !== false) {
      const AVATAR_KEY = `avatarUrl`;

      if (AVATAR_KEY in node) {
        createFileNodeFrom({
          node,
          key: AVATAR_KEY,
          // This is also linked on [createSchemaCustomization] step. See the [pluginNodeTypes.USER] type def.
          fieldName: AVATAR_KEY + `SharpOptimized`,
        });
      }
    }
  }

  // for (const key in node) {
  //   /**
  //    * Any key of any node of this plugin that has a key ending with `optimizedsharpimage`
  //    * will be automatically optimized.
  //    * This way subplugins can return the data like:
  //    * ```
  //    * return {
  //    *   ...user,
  //    *   avatarOptimizedSharpImage: user.avatarUrl, // optimized version of the avatarUrl of the user
  //    * }
  //    * ```
  //    */
  //   if (key.toLowerCase().endsWith(`optimizedsharpimage`)) {
  //     await createFileNodeFrom({node, key})
  //   }
  // }
};

exports.createSchemaCustomization = require(`./create-schema-customization`);

exports.pluginOptionsSchema = function ({ Joi }) {
  return Joi.object({
    token: Joi.string().description(
      `Default token will be provided to subplugins to allow fetch data using GitHub GraphQL API v4. Though used for auth, this token is not directly shared.`
    ),
    optimizedImagesKeyPrefix: Joi.string().description(
      `'optimizedsharpimage' by default`
    ),
    generateOptimizedGitHubUserAvatarUrl: Joi.boolean().description(
      `Wether or not should generate the optimized version of the GitHub user [avatarUrl] field. Set to [false] if you do not want to. Defaults to [true].`
    ),
    plugins: Joi.subPlugins().description(
      `A list of subplugins. See also: https://github.com/alexrintt/gatsby-source-github-graphql for examples`
    ),
  });
};
