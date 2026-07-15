import { defineTool } from '#core/tools/schema'
import { mergePathways } from '#core/pathway/merge'

export const mergePathway = defineTool({
  name: 'merge_pathway',
  mutates: true,
  description:
    'Merge another pathway diagram into the current one. Entities with matching names are combined (single node with arcs from both diagrams).',
  params: {
    source_page_id: {
      type: 'string',
      description: 'Page ID of the source pathway to merge into the current page',
      required: true
    },
    match_by: {
      type: 'string',
      description: 'Entity matching strategy. "name" matches by entity name only; "name_and_type" matches by name + glyph type.',
      enum: ['name', 'name_and_type']
    }
  },
  execute: (figma, args) => {
    const targetPageId = figma.currentPage.id
    const matchBy = (args.match_by ?? 'name_and_type') as 'name' | 'name_and_type'
    const result = mergePathways(figma.graph, args.source_page_id, targetPageId, matchBy)
    return {
      merged_entities: result.mergedEntities,
      total_entities: result.totalEntities,
      total_arcs: result.totalArcs,
      total_processes: result.totalProcesses,
      summary: `Merged: ${result.mergedEntities} entities matched, ${result.totalEntities} total entities, ${result.totalArcs} total arcs`
    }
  }
})

export const splitPathway = defineTool({
  name: 'split_pathway',
  mutates: true,
  description:
    'Split the current pathway diagram into sub-pathways. Each compartment becomes a separate page with its contained entities, processes, and arcs. Only compartments directly under the current page are split; nested compartments are moved together with their parent.',
  params: {
    strategy: {
      type: 'string',
      description: 'Split strategy. "by_compartment" creates a new page for each compartment.',
      enum: ['by_compartment'],
      required: true
    }
  },
  execute: (figma, _args) => {
    const pageId = figma.currentPage.id
    const page = figma.graph.getNode(pageId)
    if (!page) return { error: 'No current page' }

    const compartmentIds: string[] = []
    for (const childId of page.childIds) {
      const node = figma.graph.getNode(childId)
      if (node?.type === 'COMPARTMENT') compartmentIds.push(childId)
    }

    if (compartmentIds.length === 0) {
      return { error: 'No compartments found on current page' }
    }

    const pagesCreated: { page_name: string; entity_count: number; process_count: number }[] = []

    for (const compId of compartmentIds) {
      const comp = figma.graph.getNode(compId)
      if (!comp) continue

      const newPage = figma.createPage()
      const newPageProxy = figma.getNodeById(newPage.id)
      if (newPageProxy) newPageProxy.name = comp.name

      let entityCount = 0
      let processCount = 0

      const childIds = [...comp.childIds]
      for (const childId of childIds) {
        const child = figma.getNodeById(childId)
        if (!child) continue

        newPageProxy?.appendChild(child)

        const rawChild = figma.graph.getNode(childId)
        if (rawChild?.type === 'PATHWAY_GLYPH') entityCount++
        else if (rawChild?.type === 'PATHWAY_PROCESS') processCount++
      }

      pagesCreated.push({
        page_name: comp.name,
        entity_count: entityCount,
        process_count: processCount
      })
    }

    return {
      pages_created: pagesCreated.length,
      pages: pagesCreated,
      summary: `Split into ${pagesCreated.length} pages by compartment`
    }
  }
})
