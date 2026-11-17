// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=66-433
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/Empty/Empty.tsx
// component=Empty
import figma from 'figma'
const instance = figma.selectedInstance

const title = instance.getString('Title')
const description = instance.getString('Description')
const hasAction = instance.getBoolean('Action')
const icon = instance.getInstanceSwap('Icon')
let iconCode
if (icon && icon.type === 'INSTANCE') {
  iconCode = icon.executeTemplate().example
}
let actionCode
if (hasAction) {
  const action = instance.findInstance('Action')
  if (action && action.type === 'INSTANCE') {
    actionCode = action.executeTemplate().example
  }
}

export default {
  example: figma.code`<Empty
  icon={${iconCode ?? 'null'}}
  title={${JSON.stringify(title)}}
  description={${JSON.stringify(description)}}${actionCode ? figma.code`
  action={${actionCode}}` : ''}
/>`,
  imports: ['import { Empty } from "@figma/pickup-design-system"'],
  id: 'empty',
  metadata: { nestable: false },
}
