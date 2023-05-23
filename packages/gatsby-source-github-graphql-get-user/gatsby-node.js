exports.pluginOptionsSchema = function ({ Joi }) {
  return Joi.object({
    login: Joi.string().description(
      `The target user account. If omitted the authenticated user will be fetched.`
    ),
  });
};
