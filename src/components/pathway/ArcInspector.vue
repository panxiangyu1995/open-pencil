<script setup lang="ts">
import { computed } from 'vue'

import type { SceneNode, PathwayNodeData, PathwayArcType } from '@open-pencil/scene-graph'

import { useI18n } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

const { node, data } = defineProps<{
  node: SceneNode
  data: PathwayNodeData
}>()

const store = useEditorStore()
const { panels } = useI18n()

const arcType = data.arcType ?? 'consumption'

const ARC_TYPE_LABELS: Record<PathwayArcType, string> = {
  consumption: 'Consumption',
  production: 'Production',
  modulation: 'Modulation',
  stimulation: 'Stimulation',
  catalysis: 'Catalysis',
  inhibition: 'Inhibition',
  necessary_stimulation: 'Nec. Stimulation',
  trigger: 'Trigger',
  logic_and: 'Logic AND',
  logic_or: 'Logic OR',
  logic_not: 'Logic NOT',
  equivalence: 'Equivalence',
}

const sourceName = computed(() => {
  if (!data.sourceId) return '—'
  const sourceNode = store.graph.getNode(data.sourceId)
  return sourceNode?.name ?? data.sourceId
})

const targetName = computed(() => {
  if (!data.targetId) return '—'
  const targetNode = store.graph.getNode(data.targetId)
  return targetNode?.name ?? data.targetId
})
</script>

<template>
  <div class="scrollbar-thin overflow-x-hidden overflow-y-auto">
    <PanelSection :label="panels.arcType">
      <div class="px-3 py-1.5 text-xs text-muted">
        {{ ARC_TYPE_LABELS[arcType] ?? arcType }}
      </div>
    </PanelSection>

    <PanelSection :label="panels.source">
      <div class="px-3 py-1.5 text-xs text-muted">
        {{ sourceName }}
      </div>
    </PanelSection>

    <PanelSection :label="panels.target">
      <div class="px-3 py-1.5 text-xs text-muted">
        {{ targetName }}
      </div>
    </PanelSection>
  </div>
</template>
