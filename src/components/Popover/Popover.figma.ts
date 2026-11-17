// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=2381-8888
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/Popover/Popover.tsx
// component=Popover
import figma from 'figma'
const instance = figma.selectedInstance

const trigger = instance.getString('Trigger')
const title = instance.getString('Title')
const content = instance.getString('Content')
const open = instance.getEnum('State', { Closed: false, Open: true })

export default {
  example: figma.code`<Popover trigger={<Button>{${JSON.stringify(trigger)}}</Button>} title={${JSON.stringify(title)}}${open ? ' defaultOpen' : ''}>
  {${JSON.stringify(content)}}
</Popover>`,
  imports: ['import { Button, Popover } from "@figma/pickup-design-system"'],
  id: 'popover',
  metadata: { nestable: false },
}
