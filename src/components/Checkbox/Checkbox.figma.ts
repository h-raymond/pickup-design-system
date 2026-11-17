// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=2378-8889
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/Checkbox/Checkbox.tsx
// component=Checkbox
import figma from 'figma'
const instance = figma.selectedInstance

const checked = instance.getEnum('Checked', { False: 'false', True: 'true', Indeterminate: 'indeterminate' })
const state = instance.getEnum('State', { Default: 'default', Focus: 'default', Invalid: 'invalid', Disabled: 'disabled' })

let checkedCode = ''
if (checked === 'true') checkedCode = ' defaultChecked'
if (checked === 'indeterminate') checkedCode = ' checked="indeterminate"'

export default {
  example: figma.code`<Checkbox${checkedCode}${state === 'invalid' ? ' invalid' : ''}${state === 'disabled' ? ' disabled' : ''} aria-label="TODO: label" />`,
  imports: ['import { Checkbox } from "@figma/pickup-design-system"'],
  id: 'checkbox',
  metadata: { nestable: true },
}
