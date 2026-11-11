// Wraps a zod schema into an Express middleware. Validates req.body by
// default; parsed/coerced values are written back onto req.body so
// downstream handlers get clean, typed data.
export function validateRequest(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    req[source] = result.data;
    next();
  };
}
