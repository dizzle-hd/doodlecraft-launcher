import { useEffect, useState } from 'react'
import { useAccounts } from '../store/accounts'
import SkinRender from '../components/SkinRender'
import { Button } from '../components/ui'
import Icon from '../components/icons'

export default function Skins(): JSX.Element {
  const { accounts, activeId, loaded, refresh } = useAccounts()
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!loaded) refresh()
  }, [loaded, refresh])

  const account = accounts.find((a) => a.id === activeId) ?? accounts[0] ?? null

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Skins</h1>
        {account && (
          <Button variant="ghost" onClick={() => setReload((n) => n + 1)}>
            <Icon name="refresh" size={16} /> Skin neu laden
          </Button>
        )}
      </div>

      {!account ? (
        <div className="empty">Melde dich zuerst unter „Accounts“ an.</div>
      ) : (
        <div className="skin-stage skin-stage--solo">
          <SkinRender uuid={account.uuid} reloadToken={reload} height={420} rotation={0.5} />
          <div className="skin-stage__name">{account.name}</div>
        </div>
      )}
    </div>
  )
}
