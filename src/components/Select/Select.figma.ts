// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=106-112
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/Select/Select.tsx
// component=Select
import figma from 'figma'
const instance = figma.selectedInstance

const variant = instance.getEnum('Variant', { Filled: 'filled', Outline: 'outline' })
const size = instance.getEnum('Size', { Default: 'default', Compact: 'compact' })
const state = instance.getEnum('State', { Default: 'default', Focused: 'default', Invalid: 'invalid', Disabled: 'disabled' })
// "Value" is only bound on some variants; read the visible text layer instead.
const valueLayer = instance.findText('Furniture')
const value = valueLayer && valueLayer.type === 'TEXT' ? valueLayer.textContent : instance.getString('Value')

export default {
  example: figma.code`<Select${variant !== 'filled' ? ` variant="${variant}"` : ''}${size !== 'default' ? ` size="${size}"` : ''}${state === 'invalid' ? ' invalid' : ''}${state === 'disabled' ? ' disabled' : ''} aria-label="TODO: label">
  <option>{${JSON.stringify(value)}}</option>
</Select>`,
  imports: ['import { Select } from "@figma/pickup-design-system"'],
  id: 'select',
  metadata: { nestable: true },
}
