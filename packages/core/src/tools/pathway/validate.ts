import { defineTool } from '#core/tools/schema'
import { lintPathway } from '#core/pathway/lint'

export const validatePathway = defineTool({
  name: 'validate_pathway',
  mutates: false,
  description:
    'Validate the current pathway diagram against SBGN PD compliance rules. Checks for arcs between entities without process nodes, missing compartments, orphan processes, and invalid arc type combinations. Returns a report of errors and warnings; does not visually highlight issues on the canvas.',
  params: {
    page_id: {
      type: 'string',
      description: 'Page ID to validate (defaults to current page)'
    }
  },
  execute: (figma, args) => {
    const pageId = args.page_id ?? figma.currentPage.id
    const issues = lintPathway(figma.graph, pageId)

    const errors = issues.filter(i => i.severity === 'error')
    const warnings = issues.filter(i => i.severity === 'warning')

    return {
      valid: errors.length === 0,
      errors: errors.map(i => ({ rule: i.rule, node_id: i.nodeId, message: i.message })),
      warnings: warnings.map(i => ({ rule: i.rule, node_id: i.nodeId, message: i.message })),
      summary: errors.length === 0 && warnings.length === 0
        ? 'Pathway is SBGN PD compliant'
        : `Found ${errors.length} error(s) and ${warnings.length} warning(s)`
    }
  }
})
