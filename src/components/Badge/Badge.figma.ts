// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=66-383
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/Badge/Badge.tsx
// component=Badge
import figma from 'figma'
const instance = figma.selectedInstance

const variant = instance.getEnum('Variant', {
  Default: 'default',
  Secondary: 'secondary',
  Outline: 'outline',
  Condition: 'condition',
})
// The Default variant's label layer is not bound to the "Label" property, so read the layer text.
const labelLayer = instance.findText('Label')
const label = labelLayer && labelLayer.type === 'TEXT' ? labelLayer.textContent : instance.getString('Label')

export default {
  example: figma.code`<Badge${variant !== 'default' ? ` variant="${variant}"` : ''}>{${JSON.stringify(label)}}</Badge>`,
  imports: ['import { Badge } from "@figma/pickup-design-system"'],
  id: 'badge',
  metadata: { nestable: true },
}
