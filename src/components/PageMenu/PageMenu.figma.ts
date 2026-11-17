// url=https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=66-415
// source=https://github.com/h-raymond/pickup-design-system/blob/main/src/components/PageMenu/PageMenu.tsx
// component=PageMenu
import figma from 'figma'
const instance = figma.selectedInstance

function row(iconLayer: string, labelLayer: string) {
  const icon = instance.findInstance(iconLayer)
  const iconCode = icon && icon.type === 'INSTANCE' ? icon.executeTemplate().example : undefined
  const text = instance.findText(labelLayer)
  const label = text && text.type === 'TEXT' ? text.textContent : labelLayer
  return figma.code`<PageMenuItem icon={${iconCode ?? 'null'}}>{${JSON.stringify(label)}}</PageMenuItem>`
}

const saves = row('Icon / heart', 'Saves')
const selling = row('Icon / shopping-bag', 'Selling')
const purchases = row('Icon / tag', 'Purchases')
const account = row('Icon / user-circle', 'Account')

export default {
  example: figma.code`<PageMenu>
  ${saves}
  ${selling}
  ${purchases}
  ${account}
</PageMenu>`,
  imports: ['import { PageMenu, PageMenuItem } from "@figma/pickup-design-system"'],
  id: 'page-menu',
  metadata: { nestable: false },
}
