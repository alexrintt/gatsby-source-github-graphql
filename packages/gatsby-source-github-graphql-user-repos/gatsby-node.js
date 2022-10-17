exports.pluginOptionsSchema = function ({ Joi }) {
  return Joi.object({
    login: Joi.string()
      .required()
      .description(
        `The target user account. Used to fetch the repositories from GraphQL API.`
      ),
    // All below are from [Query.user.repositories(...)] filter.
    ownerAffiliations: Joi.array().items(
      Joi.string().valid(`OWNER`, `COLLABORATOR`, `ORGANIZATION_MEMBER`)
    ),
    affiliations: Joi.array().items(
      Joi.string().valid(`OWNER`, `COLLABORATOR`, `ORGANIZATION_MEMBER`)
    ),
    isLocked: Joi.boolean(),
    isFork: Joi.boolean(),
    privacy: Joi.string().valid(`PUBLIC`, `PRIVATE`, null),
    limit: Joi.number(),
  });
};
