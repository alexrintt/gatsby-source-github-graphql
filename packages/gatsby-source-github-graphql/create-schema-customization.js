const { getPluginNodeTypes } = require(`./github-graphql-defs`);
const { removeKey } = require("./utils");

module.exports = async (...args) => {
  const [gatsbyNodeApis, pluginOptions] = args;

  const pluginNodeTypes = getPluginNodeTypes(pluginOptions.pluginNodeTypes);

  const createTypes = gatsbyNodeApis.actions.createTypes;

  // All GitHub API models should have at least their ID.
  const typeDefs = Object.values(pluginNodeTypes)
    .map((type) => `type ${type} implements Node { githubId: String! }`)
    .join(`\n`);

  // Default plugin schema types
  createTypes(typeDefs);

  if (pluginOptions.generateOptimizedGitHubUserAvatarUrl !== false) {
    // Default image optimization for GitHub user model.
    const userTypeDef = `
      type ${pluginNodeTypes.USER} implements Node {
        avatarUrlSharpOptimized: File @link(from: "fields.avatarUrlSharpOptimized")
      }
      type ${pluginNodeTypes.REPOSITORY} implements Node {
        openGraphImageUrlSharpOptimized: File @link(from: "fields.openGraphImageUrlSharpOptimized")
      }
    `;
    createTypes(userTypeDef);
  }

  const { plugins = [] } = pluginOptions;

  // allow subplugins create schema customizations
  for (const plugin of plugins) {
    const resolvedPlugin = plugin.module;

    resolvedPlugin?.createSchemaCustomization?.(
      {
        ...args[0],
        githubSourcePlugin,
      },
      {
        ...removeKey(plugin.pluginOptions, `token`),
      }
    );
  }

  // allow end-users (developers) create schema customizations
  if (typeof pluginOptions.createSchemaCustomization === `function`) {
    await pluginOptions.createSchemaCustomization(gatsbyNodeApis, {
      ...pluginOptions,
      pluginNodeTypes,
    });
  }
};
