import Joi from "joi";

export const schemas = {
  add: Joi.object({
    id: Joi.number().integer().required(),
    title: Joi.string().trim().min(1).max(255).required(),
    status: Joi.string().valid("complete", "incomplete").default("incomplete"),
    date: Joi.date().required(),
  }),
  toggle: Joi.object({
    id: Joi.number().integer().required(),
  }),
  edit: Joi.object({
    id: Joi.number().integer().required(),
    title: Joi.string().trim().min(1).max(255).required(),
  }),
  remove: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });
    req.body = value;
    next();
  };
}

export const validateTopic = validate(schemas.add);
export const validateTopicUpdate = validate(schemas.edit);
