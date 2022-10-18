## Features

- It does **NOT** support Incremental Builds (not tested at least).
- It does **NOT** CMS Preview (not tested at least).
- It does **SUPPORT** image optimizations.
- It does **NOT** support gif optimizations, [simply because Gatsby does not](https://github.com/gatsbyjs/gatsby/issues/23678).
- It **PARTIALLY SUPPORTS** the GraphQL Data Layer, if you use-case is not supported yet, feel free to check [how to create a subplugin](#how-to-create-a-subplugin).

## Usage

```js
// gatsby-node.js
module.exports = {
  // ...
  plugins: [
    {
      resolve: `gatsby-source-github-graphql`,
      // Required, GitHub only allow authenticated requests.
      // Your token is not shared across subplugins unless you specify a custom token to it.
      token: process.env.GITHUB_TOKEN,
      options: {
        plugins: [
          {
            resolve: `gatsby-source-github-graphql-discussions`,
            options: {
              owner: `<your-target-username>`,
              repo: `<your-target-user-repo>`
            },
          },
          {
            // You can duplicate the plugins to fetch data from multiple times from different sources.
            resolve: `gatsby-source-github-graphql-discussions`,
            options: {
              owner: `<your-another-target-username>`,
              repo: `<another-target-user-repo>`,
              // Optional, only if you want to override the token previously defined for this plugin instance in particular.
              token: process.env.SOME_ANOTHER_GITHUB_TOKEN
            },
          }
        ]
      }
    } 
  ]
}
```

## Why does it exists

Because I'm building my blog that will be soon available at [alexrintt.com](https://alexrintt.com) and was searching for a plugin that fill these requirements:

- Fetch data from GitHub GraphQL API.
- Supports Gatsby GraphQL Data Layer.
- Supports image optimization.
- Markdown compatible (or any other markup).

### Where these requirements come from?

- Fetch data from GitHub, well - this is my data source.
- Supports Gatsby GraphQL Data Layer, this is the hard one which I kept in my requirements list for some reasons:
  1. I want to make total use of Gatsby GraphQL Data Layer (as we already have in CMS specific plugins like [gatsbyjs/gatsby/packages/gatsby-source-contentful](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-contentful) or [TryGhost/gatsby-source-ghost](https://github.com/TryGhost/gatsby-source-ghost/).
  2. I want to apply any of Gatsby optimization and transformer plugins to any of the GitHub resource types (e.g repo, user, issue, discussion, file, etc.): is it a repository? optimize it's open graph image url; is it a user? optimize it's avatar url; is it a markdown file? mark it's contents as markdown media type to optimize using MarkdownRemark.
  3. From the previous point I also wanted to make it easy to extend and easy to replace, so I'll be able to extend when a use-case is missing but I'll also be able to replace in case of my use-case is different, e.g: if I've a plugin that optimize all GitHub issues as markdown files but instead I want to optimize as AsciiDoc files (or any custom processing), what should I do?
- Supports image optimization, bandwidth bla-bla - this is also important but lets talk about this motherf [web.dev/optimize-cls](https://web.dev/optimize-cls/).
- Markdown compatible (or any other markup), at this moment I'm using the discussions of a repository as markdown files to build a blog, but what if I want to switch in the future, or maybe change the processing rule or package?

### What I've tried before:

- [mosch/gatsby-source-github](https://github.com/mosch/gatsby-source-github/blob/master/src/gatsby-node.js) this unfortunately only supports fetching the file tree and the releases of a repository.
- [ldd/gatsby-source-github-api](https://github.com/ldd/gatsby-source-github-api) which also doesn't support relationships. All nodes are the same type, which means there are no connection between data required; there are only flat nodes (of type `GithubData`).
- [stevetweeddale/gatsby-source-git](https://github.com/stevetweeddale/gatsby-source-git) useful only if you pulling you repository markdown tree.
- [gatsbyjs/gatsby/packages/gatsby-source-graphql](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-graphql) this also has known limitation:
  > This plugin has [known limitations](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-graphql#known-limitations), specifically in that 1. it does not support Incremental Builds, 2. CMS Preview, 3. image optimizations, 4. and lack of full support for the GraphQL data layer.

### Solution?

This monorepo is a Gatsby data source plugin + set of source subplugins which aims to provide a granular way to fetch typed and connected GitHub data chunks.

Technically saying:

- `coreplugin` is the actually Gatsby source plugin that is plugged directly into your `gatsby-config.js` and it's available under _/packages/gatsby-source-github-graphql_.
- `subplugins` can be any Gatsby subplugin (under your Gatsby project at _/plugins/your-gatsby-plugin-that-will-be-used-as-subplugin_ or one of the already supported plugins at _/packages/gatsby-source-github-graphql-some-cool-usecase_ in this repo.
- The core plugin request it's subplugins to fetch what data they want to `coreplugin.sourceNodes -> subplugins.sourceNodes`.
- Then the core plugin connect the edges by creating the nodes by it's types `coreplugin.onCreateNodes`.
- And finally the core plugin request it's subplugins again to create the schema customization through `subplugin.createSchemaCustomization`.

This is an answer and a question because I don't know if it's ok to create plugins in this way, I tried to copy/keep the same essence of [gatsbyjs/gatsby/packages/gatsby-transformer-remark](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-transformer-remark) but I'm not sure if it's sustentable, I did it only for personal use while trying to make it easy for me to extend in case of in the future adding some blog feature or modify an existing one.

But as always, do you have an idea or recommendation? just push it into the issues stack. Your use-case is not supported yet? feel free [to create a subplugin](#how-to-create-a-subplugin) and open a pull request.

## How to create a subplugin 

Lets learn by example, the following section will create a subplugin which will fetch the \[viewer] or a given user from his \[login] and add it to the Gatsby GraphQL Data Layer.

### Defining your plugin options

Most plugins use options to customize their behavior, in our case we need to know the login, even though not required.

1. In your Gatsby project, create the plugin folder _plugins/gatsby-source-github-graphql-get-user_.

2. From now, we'll be working inside this folder.

3. Create a file called `gatsby-node.js`.

4. In this file lets specify which options we're expecting, in our case: the user \[login] which is not required since if it's omitted we will fetch the \[viewer] user (Gatsby uses [Joi](https://joi.dev/api/?v=17.6.1) for schema validation).

```js
exports.pluginOptionsSchema = function ({ Joi }) {
  return Joi.object({
    login: Joi.string()
      .description(`The target user account. If omitted the authenticated user will be fetched.`)
  })
}
```

5. Create a file `index.js` with the following contents:

```js
// Equivalent to [sourceNodes] gatsby API.
module.exports.sourceNodes = async (gatsbyNodeApis, pluginOptions) => {
  // The [login] option we specified earlier in the [gatsby-node.js] file.
  // Remember we did not marked as required so it can be null or undefined.
  const { login } = pluginOptions;

  // [githubSourcePlugin] was inserted by the core plugin and here lives all non-official (those provided by Gatsby) APIs.
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

  const { user, repositories } = await graphql(
    `
      query GetViewer($login: String!) {
        user(login: $login) {
          ${githubPlainResolverFields.USER}
        }
      }
    `,
    {
      login: login
    }
  )

  return {
    // Always define the key as data type and the value as an array of the data.
    [pluginNodeTypes.USER]: [user],
    [pluginNodeTypes.REPOSITORY]: [...repositories],
  };
}

module.exports.onCreateNode = ({ node,  }, pluginOptions) => {
  const { pluginNodeTypes } = pluginOptions;
  
  if (node.internal.type === pluginNodeTypes.USER) {
    if (`avatarUrl` in node) {
      await createFileNodeFrom({
        node,
        key: `avatarUrl`,
        // This is also linked on [createSchemaCustomization] step. See the [pluginNodeTypes.USER] type def.
        fieldName: `optimizedAvatar`,
      });
    }    
  }
}

module.exports.createSchemaCustomization = ({ actions: { createTypes }, githubSourcePlugin }, pluginOptions) => {
  const { pluginNodeTypes } = githubSourcePlugin;

  const userWithOptimizedAvatarTypeDef = `
    type ${pluginNodeTypes.USER} implements Node {
      optimizedAvatar: File @link(from: "fields.optimizedAvatar")
    }
  `;
  
  createTypes(userWithOptimizedAvatarTypeDef);
}
```

