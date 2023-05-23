// plugins/gatsby-source-github-graphql-get-user/index.js

// Equivalent to [sourceNodes] gatsby API.
module.exports.sourceNodes = async (gatsbyNodeApis, pluginOptions) => {
  // The [login] option we specified earlier in the [gatsby-node.js] file.
  // Remember we did not marked as required so it can be null or undefined.
  const { login } = pluginOptions;

  // [githubSourcePlugin] was inserted by the core plugin and here lives all non-official (those provided by the core plugin not Gatsby) APIs.
  const { githubSourcePlugin } = gatsbyNodeApis;

  // This [graphql] is from ocktokit/graphql.js package.
  // Even though is not possible to access the token directly,
  // you can make authenticated requests using this graphql client.
  // The authenticated user is defined in the [pluginOptions.token] or [yourSubpluginOptions.token].
  const { graphql } = githubSourcePlugin;

  // Did not found an way to share fragments across subplugins to avoid repetition and lack of data so I did raw strings.
  // This is safe to insert in the query since it is package defined and has no user input.
  // You can use it or not. If you think it's not required (e.g you are fetching repositories of a user, you don't care about the user data itself) then just skip it for the user resolver.
  const { githubPlainResolverFields } = githubSourcePlugin;

  // Always use this variable to define types.
  // Otherwise we will not be able to customize the types if a conflict between plugins node types happens.
  const { pluginNodeTypes } = githubSourcePlugin;

  const userQuery = `
    query GetUser($login: String!) {
      user(login: $login) {
        ${githubPlainResolverFields.USER}
      }
    }
  `;

  const viewerQuery = `
    query GetViewer {
      viewer {
        ${githubPlainResolverFields.USER}
      }
    }
  `;

  // Wether or not we should fetch a user by its [login] option.
  const isCustomUser = typeof login === `string`;

  // If there's a custom user, fetch through user query otherwise use the viewer query.
  const query = isCustomUser ? userQuery : viewerQuery;

  // Same logic for the variables: custom user requires its [login]
  // But the [viewer] is resolved in the GitHub server through the provided token, so don't need variables.
  const variables = isCustomUser ? { login: login } : {};

  // You can also add a query alias for [viewer] or [user] query.
  // But for simplicity lets extract both keys take the not-null one.
  const { user: customUser, viewer: viewerUser } = await graphql(
    query,
    variables
  );
  const user = customUser ?? viewerUser;

  return {
    // Always define the key as data type and the value as an array of the data.
    [pluginNodeTypes.USER]: [user],
  };
};

// The user avatarURL is optimized by default in the core plugin since it's a intrinsic use-case and it's available under the 'avatarUrlSharpOptimized' key.
// But just for 'fun' lets create a custom key in the user node type to store a second optimized image URL (just for example purposes).
module.exports.onCreateNode = async (
  { node, githubSourcePlugin },
  pluginOptions
) => {
  // [createFileNodeFrom] is new here and it's available only inside of [onCreateNode] function.
  // This function actually calls [createRemoteFileNode] from [gatsby-source-filesystem] and links to
  // its parent node, in this case our custom user, it's basically a helper function for image optimization.
  const { pluginNodeTypes, createFileNodeFrom } = githubSourcePlugin;

  if (node.internal.type === pluginNodeTypes.USER) {
    if (`avatarUrl` in node) {
      await createFileNodeFrom({
        node,
        // Must be the key which stores the actually remote image URL, it's returned by the GitHub API.
        key: `avatarUrl`,
        // Important: this [fieldName] defines the key that our image will
        // be stored inside of the Gatsby reserved [fields] key.
        fieldName: `optimizedAvatarField`,
      });
    }
  }
};

module.exports.createSchemaCustomization = (
  { actions: { createTypes }, githubSourcePlugin },
  pluginOptions
) => {
  const { pluginNodeTypes } = githubSourcePlugin;

  // Now lets define that the User type will have the key
  // [optimizedAvatar] that should be linked from the previously created field [optimizedAvatarField].
  const userWithOptimizedAvatarTypeDef = `
    type ${pluginNodeTypes.USER} implements Node {
      optimizedAvatar: File @link(from: "fields.optimizedAvatarField")
    }
  `;

  // Now call the API to actually create it.
  createTypes(userWithOptimizedAvatarTypeDef);
};
