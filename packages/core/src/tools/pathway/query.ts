import { defineTool } from '#core/tools/schema'

import {
  searchPathways,
  getPathwayDetails,
  getPathwayParticipants,
  findPathwaysByGene
} from '#core/pathway/knowledge/reactome'

import {
  getProteinInteractions,
  searchPathwayCommons
} from '#core/pathway/knowledge/pathway-commons'

export const queryPathwayDb = defineTool({
  name: 'query_pathway_db',
  mutates: false,
  description:
    'Query biological pathway databases (Reactome, Pathway Commons) to find pathways by name, gene, protein interactions, or get pathway details and participants.',
  params: {
    source: {
      type: 'string',
      description: 'Database to query',
      required: true,
      enum: ['reactome', 'pathway_commons']
    },
    query_type: {
      type: 'string',
      description: 'Type of query',
      required: true,
      enum: ['search_pathway', 'gene_to_pathway', 'pathway_details', 'pathway_reactions', 'protein_interactions']
    },
    query: {
      type: 'string',
      description: 'Search term (pathway name, gene symbol, or stable ID)',
      required: true
    },
    species: {
      type: 'string',
      description: 'Species filter (e.g. "Homo sapiens")'
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results',
      min: 1,
      max: 100
    }
  },
  execute: async (_figma, args) => {
    try {
      const limit = args.limit ?? 20

      if (args.source === 'pathway_commons') {
        switch (args.query_type) {
          case 'search_pathway': {
            const results = await searchPathwayCommons(args.query, limit)
            return {
              source: 'pathway_commons',
              count: results.length,
              pathways: results.map(r => ({
                uri: r.uri,
                name: r.name,
                data_sources: r.dataSource
              }))
            }
          }
          case 'protein_interactions': {
            const results = await getProteinInteractions(args.query, limit)
            return {
              source: 'pathway_commons',
              gene: args.query,
              count: results.length,
              interactions: results.map(r => ({
                source: r.source,
                target: r.target,
                type: r.type,
                data_sources: r.dataSources
              }))
            }
          }
          default:
            return { error: `Pathway Commons does not support query_type "${args.query_type}". Supported: search_pathway, protein_interactions` }
        }
      }

      switch (args.query_type) {
        case 'search_pathway': {
          const results = await searchPathways(args.query, args.species)
          return {
            source: 'reactome',
            count: results.length,
            pathways: results.slice(0, limit).map(r => ({
              id: r.stableId,
              name: r.name,
              species: r.species
            }))
          }
        }
        case 'gene_to_pathway': {
          const results = await findPathwaysByGene(args.query, args.species)
          return {
            source: 'reactome',
            gene: args.query,
            count: results.length,
            pathways: results.slice(0, limit).map(r => ({
              id: r.stableId,
              name: r.name,
              species: r.species
            }))
          }
        }
        case 'pathway_details': {
          const details = await getPathwayDetails(args.query)
          if (!details) return { error: `Pathway not found: ${args.query}` }
          return { source: 'reactome', id: args.query, details }
        }
        case 'pathway_reactions': {
          const participants = await getPathwayParticipants(args.query)
          return {
            source: 'reactome',
            id: args.query,
            count: participants.length,
            participants: participants.slice(0, limit).map(p => ({
              name: p.displayName,
              type: p.typeName,
              class: p.schemaClass
            }))
          }
        }
        case 'protein_interactions': {
          return { error: 'Reactome does not support protein_interactions query. Use source="pathway_commons" instead.' }
        }
        default:
          return { error: `Unknown query_type: ${args.query_type}` }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { error: `Query failed: ${message}` }
    }
  }
})
