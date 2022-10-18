exports.pluginOptionsSchema = function ({ Joi }) {
  return Joi.object({
    owner: Joi.string()
      .required()
      .description(
        `The target user account. Use it to fetch the discussions from GraphQL API. Combine this option with [repo] option.`
      ),
    repo: Joi.string()
      .required()
      .description(
        `The target repository of the given [owner] account. Combine this with [repo] option.`
      ),
    maxDiscussionsCount: Joi.string().description(
      `Limit the discussions count at build time level. Useful for development to avoid loading all discussion at once.`
    ),
    orderByDirection: Joi.string(),
    orderByField: Joi.string(),
    categoryIds: Joi.array().items(Joi.string()),
    categorySlugs: Joi.array().items(Joi.string()),
  });
};
