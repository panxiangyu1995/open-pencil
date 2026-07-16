<script setup lang="ts">
import { computed } from 'vue'

import { getPathwayData } from '@signal-forge/scene-graph'
import { useSelectionState } from '@signal-forge/vue'

import ArcInspector from './ArcInspector.vue'
import CompartmentInspector from './CompartmentInspector.vue'
import GlyphInspector from './GlyphInspector.vue'
import ProcessInspector from './ProcessInspector.vue'

const { selectedNode: node } = useSelectionState()

const pathwayData = computed(() => (node.value ? getPathwayData(node.value) : null))

const nodeType = computed(() => node.value?.type ?? null)

const isPathwayNode = computed(() =>
  nodeType.value === 'PATHWAY_GLYPH'
  || nodeType.value === 'PATHWAY_PROCESS'
  || nodeType.value === 'PATHWAY_ARC'
  || nodeType.value === 'COMPARTMENT'
)
</script>

<template>
  <div v-if="isPathwayNode && node && pathwayData" class="flex flex-col">
    <GlyphInspector
      v-if="nodeType === 'PATHWAY_GLYPH'"
      :node="node"
      :data="pathwayData"
    />
    <ProcessInspector
      v-else-if="nodeType === 'PATHWAY_PROCESS'"
      :node="node"
      :data="pathwayData"
    />
    <ArcInspector
      v-else-if="nodeType === 'PATHWAY_ARC'"
      :node="node"
      :data="pathwayData"
    />
    <CompartmentInspector
      v-else-if="nodeType === 'COMPARTMENT'"
      :node="node"
      :data="pathwayData"
    />
  </div>
</template>
