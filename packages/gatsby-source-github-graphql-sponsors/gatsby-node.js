exports.pluginOptionsSchema = function ({ Joi }) {
  return Joi.object({
    login: Joi.string().required().description(`The target user account.`),
  })
}
