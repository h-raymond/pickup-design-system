// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=2399-8887
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/Alert/Alert.tsx
// component=Alert
import figma from 'figma'
const instance = figma.selectedInstance

const title = instance.getString('Title')
const description = instance.getString('Description')
const variant = instance.getEnum('Variant', { Default: 'default', Destructive: 'destructive' })
// Only the Default variant exposes the Icon swap; Destructive uses a fixed exclamation-triangle (the component's default).
let iconCode
if (variant === 'default') {
  const icon = instance.getInstanceSwap('Icon')
  if (icon && icon.type === 'INSTANCE') {
    iconCode = icon.executeTemplate().example
  }
}

export default {
  example: figma.code`<Alert${variant !== 'default' ? ` variant="${variant}"` : ''}${iconCode ? figma.code` icon={${iconCode}}` : ''} title={${JSON.stringify(title)}} description={${JSON.stringify(description)}} />`,
  imports: ['import { Alert } from "@figma/pickup-design-system"'],
  id: 'alert',
  metadata: { nestable: false },
}
