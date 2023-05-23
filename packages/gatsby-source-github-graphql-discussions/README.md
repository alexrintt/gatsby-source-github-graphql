## Installation

To install this package just run:

```shell
npm install https://gitpkg.now.sh/alexrintt/gatsby-source-github-graphql/packages/gatsby-source-github-graphql-discussions?main
# or
yarn add https://gitpkg.now.sh/alexrintt/gatsby-source-github-graphql/packages/gatsby-source-github-graphql-discussions?main
```

## Usage

In your `gatsby-config.js`:

```js
{
  resolve: `gatsby-source-github-graphql`,
  options: {
    // ...
    plugins: [
      {
        resolve: `gatsby-source-github-graphql-discussions`,
        options: {
          owner: `alexrintt`,
          repo: `rintt`,
          // Most likely to be an Announcements channel category, this way
          // only users with repo write access can allow a post to be deployed.
          categorySlugs: [`Published`],

          // You can use this key to filter any resource.
          // So you can use multiple instances of this plugin, 
          // keep the relationships and filter then.
          source: `Post`
        }
      }
    ]
  }
}
```

## Features

<p>
  <img src="https://user-images.githubusercontent.com/51419598/194051206-ec8bfac4-bcc0-4c8b-9f0a-4267d72b98d7.png" width="250" />
  <img src="https://user-images.githubusercontent.com/51419598/194051344-0a5770fa-1269-4467-9024-37039aac2f75.png" width="250" /><br />
  <img src="https://user-images.githubusercontent.com/51419598/194058887-de70e09c-da65-4901-bd8b-e99ec8c3904b.png" width="250" />
  <img src="https://user-images.githubusercontent.com/51419598/194051081-5f30f1ca-b580-4249-b374-45469e9c0fa9.png" width="250" />
</p>

<br>

<samp>

<h2 align="center">
  Open Source
</h2>
<p align="center">
  <sub>Copyright © 2022-present, Alex Rintt.</sub>
</p>
<p align="center">Gatsby Source GitHub GraphQL Discussions <a href="/LICENSE">is MIT licensed 💖</a></p>
<p align="center">
  <img src="https://user-images.githubusercontent.com/51419598/194058464-f67c7fb5-9066-49b5-aa94-cf34830708ad.png" width="35" />
</p>

</samp>
