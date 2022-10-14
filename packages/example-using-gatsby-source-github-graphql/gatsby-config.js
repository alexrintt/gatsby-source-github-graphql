const path = require("path")

require(`dotenv`).config()

module.exports = {
  siteMetadata: {
    title: `Gatsby GitHub GraphQL Source`,
    description: `Fetch data from GitHub and keep the connections and relationships between nodes.`,
    author: `@alexrintt`,
    siteUrl: `https://github.com/alexrintt/gatsby-source-github-graphql`,
  },
  plugins: [
    {
      resolve: `gatsby-source-github-graphql`,
      options: {
        onCreateNode: async (
          { node, isInternalType, createFileNodeFrom },
          { pluginNodeTypes }
        ) => {},
        createSchemaCustomization: ({ createTypes }, { pluginNodeTypes }) => {},
        createCustomMapper: ({ pluginNodeTypes }) => {
          return {
            [pluginNodeTypes.DISCUSSION]: discussion => {
              return {
                ...discussion,
                myCustomField: `Something`,
              }
            },
          }
        },
        token: process.env.GITHUB_TOKEN,
        plugins: [
          {
            // Plugin to fetch all discussions of a repository and adding markdown features to the [discussion.body] field.
            resolve: `gatsby-source-github-graphql-discussions`,
            options: {
              owner: `alexrintt`,
              repo: `rintt`,
              categorySlugs: [`Published`],
            },
          },
          {
            // Plugin to fetch sponsors and sponsoring data of the given user [login].
            resolve: `gatsby-source-github-graphql-sponsors`,
            options: {
              login: `kotx`,
            },
          },
        ],
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-plugin-image`,
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [`gatsby-remark-images-remote`],
      },
    },
  ],
}
