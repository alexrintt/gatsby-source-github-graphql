## Why does it exists

I was searching for a plugin that fill these requirements:

- Fetch data from GitHub GraphQL API.
- Supports Gatsby GraphQL Data Layer.
- Supports image optimization.
- Markdown compatible (or any other markup).

### Why do I need it:

- Fetch data from GitHub, well - this is my data source.
- Supports Gatsby GraphQL Data Layer, this is the hard one which I kept in my requirements list for some reasons:
  1. I want to make total use of Gatsby GraphQL Data Layer (as we already have in CMS specific plugins like [gatsbyjs/gatsby/packages/gatsby-source-contentful](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-contentful) or [TryGhost/gatsby-source-ghost](https://github.com/TryGhost/gatsby-source-ghost/).
  2. I want to apply any of Gatsby optimization and transformer plugins to any of the GitHub resource types (e.g repo, user, issue, discussion, file, etc.): is it a repository? optimize it's open graph image url; is it a user? optimize it's avatar url; is it a markdown file? mark it's contents as markdown media type to optimize using MarkdownRemark.
  3. From the previous point I also wanted to make it easy to extend and easy to replace, so I'll be able to extend when a use-case is missing but I'll also be able to replace in case of my use-case is different, e.g: if I've a plugin that optimize all GitHub issues as markdown files but instead I want to optimize as AsciiDoc files (or any custom processing), what should I do?
- Supports image optimization, bandwidth bla-bla - this is also important but lets talk about this motherf [https://web.dev/optimize-cls/](https://web.dev/optimize-cls/).

### What I've tried before:

- [mosch/gatsby-source-github](https://github.com/mosch/gatsby-source-github/blob/master/src/gatsby-node.js) this unfortunately only supports fetching the file tree and the releases of a repository.
- [ldd/gatsby-source-github-api](https://github.com/ldd/gatsby-source-github-api) which also doesn't support relationships. All nodes are the same type, which means there are no connection between data required; there are only flat nodes (of type `GithubData`).
- [stevetweeddale/gatsby-source-git](https://github.com/stevetweeddale/gatsby-source-git) useful only if you pulling you repository markdown tree.
- [gatsbyjs/gatsby/packages/gatsby-source-graphql](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-graphql) this also has known limitation:
  > This plugin has [known limitations](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-source-graphql#known-limitations), specifically in that 1. it does not support Incremental Builds, 2. CMS Preview, 3. image optimizations, 4. and lack of full support for the GraphQL data layer.

### Features

- It does **NOT** support Incremental Builds (not tested at least).
- It does **NOT** CMS Preview (not tested at least).
- It does **SUPPORT** image optimizations.
- It does **NOT** support gif optimizations, [simply because Gatsby does not](https://github.com/gatsbyjs/gatsby/issues/23678).
- It **PARTIALLY SUPPORT** support the GraphQL data layer, if you use-case is not supported yet, feel free to check [how to create a subplugin](#how-to-create-a-subplugin).

### How to create a subplugin 

...

### Solution?

This is an answer and a question because I don't know if it's ok to create plugins in this way, I tried to copy/keep the same essence of [gatsbyjs/gatsby/packages/gatsby-transformer-remark](https://github.com/gatsbyjs/gatsby/tree/master/packages/gatsby-transformer-remark) but I'm not sure if it's correct and I did it only for personal use while trying to make it easy for me to extend in case of in the future adding some blog feature or modify an existing one.
