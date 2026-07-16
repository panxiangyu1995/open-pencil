<script setup lang="ts">
import { ColorPickerRoot } from '@signal-forge/vue'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel.vue'
import { usePopoverUI } from '@/components/ui/popover'

import type { Color } from '@signal-forge/scene-graph/primitives'
import type { OkHCLControls } from '@signal-forge/vue'

const { color, okhcl = null } = defineProps<{ color: Color; okhcl?: OkHCLControls | null }>()
const emit = defineEmits<{ update: [color: Color] }>()
const cls = usePopoverUI({ content: 'w-56 p-2' })
</script>

<template>
  <ColorPickerRoot
    :color="color"
    :ui="{
      content: cls.content,
      swatch: 'size-5 shrink-0 cursor-pointer rounded border border-border p-0'
    }"
    @update="emit('update', $event)"
  >
    <template #default="{ color: currentColor }">
      <ColorPickerPanel :color="currentColor" :okhcl="okhcl" @update="emit('update', $event)" />
    </template>
  </ColorPickerRoot>
</template>
