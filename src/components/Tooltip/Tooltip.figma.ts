// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=2382-8891
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/Tooltip/Tooltip.tsx
// component=TooltipContent
import figma from 'figma'
const instance = figma.selectedInstance

const text = instance.getString('Text')
const side = instance.getEnum('Side', { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' })

export default {
  example: figma.code`<TooltipContent${side !== 'top' ? ` side="${side}"` : ''}>{${JSON.stringify(text)}}</TooltipContent>`,
  imports: ['import { TooltipContent } from "@figma/pickup-design-system"'],
  id: 'tooltip',
  metadata: { nestable: false },
}
