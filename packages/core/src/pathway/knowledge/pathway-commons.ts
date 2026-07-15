const PATHWAY_COMMONS_API_BASE = 'https://www.pathwaycommons.org/pc2'
const FETCH_TIMEOUT = 10_000

interface Interaction {
  source: string
  target: string
  type: string
  dataSources: string[]
}

async function safeFetch(url: string): Promise<Response | null> {
  if (typeof fetch === 'undefined') return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function getProteinInteractions(
  gene: string,
  limit = 20
): Promise<Interaction[]> {
  const params = new URLSearchParams({
    q: gene,
    format: 'JSON',
    kind: 'neighborhood',
    limit: String(limit)
  })

  const url = `${PATHWAY_COMMONS_API_BASE}/search?${params.toString()}`
  const response = await safeFetch(url)
  if (!response?.ok) return []

  try {
    const data = await response.json() as {
      graph?: {
        edges?: Array<{
          sourceId: string
          targetId: string
          label?: string
          data?: { dataSource?: string[] }
        }>
      }
    }

    const edges = data.graph?.edges ?? []
    return edges.map(e => ({
      source: e.sourceId,
      target: e.targetId,
      type: e.label ?? 'interacts',
      dataSources: e.data?.dataSource ?? []
    }))
  } catch {
    return []
  }
}

export async function searchPathwayCommons(
  query: string,
  limit = 20
): Promise<Array<{ uri: string; name: string; dataSource: string[] }>> {
  const params = new URLSearchParams({
    q: query,
    format: 'JSON',
    limit: String(limit)
  })

  const url = `${PATHWAY_COMMONS_API_BASE}/search?${params.toString()}`
  const response = await safeFetch(url)
  if (!response?.ok) return []

  try {
    const data = await response.json() as {
      searchHit?: Array<{
        uri?: string
        name?: string
        dataSource?: string[]
      }>
    }

    return (data.searchHit ?? []).map(h => ({
      uri: h.uri ?? '',
      name: h.name ?? '',
      dataSource: h.dataSource ?? []
    }))
  } catch {
    return []
  }
}
