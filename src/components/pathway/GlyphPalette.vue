<script setup lang="ts">
import type { PathwayGlyphType, PathwayProcessType, PathwayArcType } from '@open-pencil/scene-graph'

import GlyphButton from './GlyphButton.vue'
import ArcButton from './ArcButton.vue'

defineProps<{
  activeGlyphType: PathwayGlyphType | null
  activeArcType: PathwayArcType | null
}>()

const emit = defineEmits<{
  selectGlyph: [type: PathwayGlyphType]
  selectProcess: [type: PathwayProcessType]
  selectArc: [type: PathwayArcType]
}>()

const entities: { type: PathwayGlyphType; label: string }[] = [
  { type: 'macromolecule', label: 'Protein' },
  { type: 'simple_chemical', label: 'Small Molecule' },
  { type: 'complex', label: 'Complex' },
  { type: 'nucleic_acid_feature', label: 'Gene/RNA' },
  { type: 'perturbation', label: 'Drug' },
  { type: 'phenotype', label: 'Phenotype' },
  { type: 'source_sink', label: 'Degradation' },
  { type: 'unspecified_entity', label: 'Unknown' },
]

const processes: { type: PathwayProcessType; label: string }[] = [
  { type: 'process', label: 'Reaction' },
  { type: 'transport', label: 'Transport' },
  { type: 'association', label: 'Association' },
  { type: 'dissociation', label: 'Dissociation' },
  { type: 'omitted_process', label: 'Omitted' },
  { type: 'uncertain_process', label: 'Uncertain' },
]

const arcs: { type: PathwayArcType; label: string }[] = [
  { type: 'production', label: 'Production' },
  { type: 'consumption', label: 'Consumption' },
  { type: 'catalysis', label: 'Catalysis' },
  { type: 'inhibition', label: 'Inhibition' },
  { type: 'stimulation', label: 'Stimulation' },
  { type: 'necessary_stimulation', label: 'Nec. Stimulation' },
  { type: 'modulation', label: 'Modulation' },
  { type: 'trigger', label: 'Trigger' },
  { type: 'logic_and', label: 'Logic AND' },
  { type: 'logic_or', label: 'Logic OR' },
  { type: 'logic_not', label: 'Logic NOT' },
  { type: 'equivalence', label: 'Equivalence' },
]
</script>

<template>
  <div class="flex flex-col gap-3 p-3">
    <div>
      <h3 class="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Entities</h3>
      <div class="grid grid-cols-2 gap-1">
        <GlyphButton
          v-for="e in entities"
          :key="e.type"
          :glyph-type="e.type"
          :label="e.label"
          :active="activeGlyphType === e.type"
          @click="emit('selectGlyph', e.type)"
        />
      </div>
    </div>

    <div>
      <h3 class="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Processes</h3>
      <div class="grid grid-cols-2 gap-1">
        <GlyphButton
          v-for="p in processes"
          :key="p.type"
          :glyph-type="p.type"
          :label="p.label"
          :active="false"
          @click="emit('selectProcess', p.type)"
        />
      </div>
    </div>

    <div>
      <h3 class="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Arcs</h3>
      <div class="grid grid-cols-2 gap-1">
        <ArcButton
          v-for="a in arcs"
          :key="a.type"
          :arc-type="a.type"
          :label="a.label"
          :active="activeArcType === a.type"
          @click="emit('selectArc', a.type)"
        />
      </div>
    </div>
  </div>
</template>
