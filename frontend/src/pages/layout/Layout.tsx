import { useContext, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { CosmosDBStatus } from '../../api'
import Contoso from '../../assets/Contoso.svg'   // 👈 your logo file here
import { HistoryButton, ShareButton } from '../../components/common/Button'
import { AppStateContext } from '../../state/AppProvider'
import styles from './Layout.module.css'

const Layout = () => {
  const [isSharePanelOpen, setIsSharePanelOpen] = useState<boolean>(false)
  const appStateContext = useContext(AppStateContext)
  const ui = appStateContext?.state.frontendSettings?.ui

  // Toggle functions
  const toggleHistory = () =>
    appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' })
  const toggleShare = () => setIsSharePanelOpen(v => !v)

  return (
    <div className={styles.appShell}>
      {/* HEADER */}
      <header className={styles.header} role="banner">
        <div className={styles.headerRow}>
          {/* Corner logo — always visible */}
          <div className={styles.headerLeft}>
            <img src={Contoso} alt="logo" className={styles.logo} />
          </div>

          {/* Removed center Anemia Assistant text */}
          <div className={styles.headerCenter}></div>

          {/* Right-side buttons */}
          <div className={styles.headerRight}>
            {appStateContext?.state.isCosmosDBAvailable?.status !==
              CosmosDBStatus.NotConfigured &&
              ui?.show_chat_history_button !== false && (
                <HistoryButton
                  onClick={toggleHistory}
                  text={
                    appStateContext?.state?.isChatHistoryOpen
                      ? 'Hide history'
                      : 'Show history'
                  }
                />
              )}
            {ui?.show_share_button && (
              <ShareButton onClick={toggleShare} text="Share" />
            )}
          </div>
        </div>
      </header>

      {/* MAIN CHAT PAGE */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Share modal (optional) */}
      {isSharePanelOpen && (
        <div className={styles.shareSheet} role="dialog" aria-modal="true">
          <div className={styles.shareCard}>
            <h3 className={styles.shareTitle}>Share this page</h3>
            <input
              readOnly
              value={window.location.href}
              className={styles.shareInput}
            />
            <div className={styles.shareActions}>
              <button
                className={styles.btn}
                onClick={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
              >
                Copy link
              </button>
              <button className={styles.btnGhost} onClick={toggleShare}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout
