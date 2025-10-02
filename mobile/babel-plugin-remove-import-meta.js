/**
 * Babel plugin to remove import.meta references
 * Transforms import.meta.env to process.env for web compatibility
 */

module.exports = function ({ types: t }) {
  return {
    name: 'remove-import-meta',
    visitor: {
      // Handle import.meta.env member expressions
      MemberExpression(path) {
        const { object, property } = path.node;

        // Check if this is import.meta.env
        if (
          t.isMetaProperty(object) &&
          object.meta.name === 'import' &&
          object.property.name === 'meta' &&
          t.isIdentifier(property, { name: 'env' })
        ) {
          // Replace import.meta.env with process.env
          path.replaceWith(
            t.memberExpression(
              t.identifier('process'),
              t.identifier('env')
            )
          );
          // Skip traversal of children since we replaced the node
          path.skip();
        }
      },

      // Handle bare import.meta (not followed by .env)
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          // Only replace if not already handled by MemberExpression visitor
          // Check if parent is a MemberExpression accessing .env
          if (
            !t.isMemberExpression(path.parent) ||
            !t.isIdentifier(path.parent.property, { name: 'env' })
          ) {
            // Replace bare import.meta with an empty object
            path.replaceWith(
              t.objectExpression([])
            );
          }
        }
      },
    },
  };
};
