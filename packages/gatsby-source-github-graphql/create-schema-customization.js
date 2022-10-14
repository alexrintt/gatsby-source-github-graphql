const { getPluginNodeTypes } = require(`./github-graphql-defs`);

module.exports = async (gatsbyNodeApis, pluginOptions) => {
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
    `;
    createTypes(userTypeDef);
  }

  const { plugins = [] } = pluginOptions;

  // allow subplugins create schema customizations
  for (const plugin of plugins) {
    const resolvedPlugin = plugin.module;

    const createSchemaCustomization = resolvedPlugin.createSchemaCustomization;

    if (typeof createSchemaCustomization === `function`) {
      createSchemaCustomization(gatsbyNodeApis, {
        ...plugin.pluginOptions,
        pluginNodeTypes,
      });
    }
  }

  // allow end-users (developers) create schema customizations
  if (typeof pluginOptions.createSchemaCustomization === `function`) {
    await pluginOptions.createSchemaCustomization(gatsbyNodeApis, {
      ...pluginOptions,
      pluginNodeTypes,
    });
  }
};
