import { useRef, useState, useEffect, useContext, useLayoutEffect } from 'react'
import { CommandBarButton, IconButton, Dialog, DialogType, Stack } from '@fluentui/react'
import { SquareRegular, ShieldLockRegular, ErrorCircleRegular } from '@fluentui/react-icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import uuid from 'react-uuid'
import { isEmpty } from 'lodash'
import DOMPurify from 'dompurify'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism'
import styles from './Chat.module.css'
import { XSSAllowTags } from '../../constants/sanatizeAllowables'

import {
  ChatMessage, ConversationRequest, conversationApi, Citation, ToolMessageContent,
  AzureSqlServerExecResults, ChatResponse, getUserInfo, Conversation, historyGenerate,
  historyUpdate, historyClear, ChatHistoryLoadingState, CosmosDBStatus, ErrorMessage, ExecResults,
} from "../../api";
import { Answer } from "../../components/Answer";
import { QuestionInput } from "../../components/QuestionInput";
import { ChatHistoryPanel } from "../../components/ChatHistory/ChatHistoryPanel";
import { AppStateContext } from "../../state/AppProvider";
import { useBoolean } from "@fluentui/react-hooks";

const enum messageStatus { NotRunning = 'Not Running', Processing = 'Processing', Done = 'Done' }

const Chat = () => {
  const appStateContext = useContext(AppStateContext)
  const ui = appStateContext?.state.frontendSettings?.ui
  const AUTH_ENABLED = appStateContext?.state.frontendSettings?.auth_enabled
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [showLoadingMessage, setShowLoadingMessage] = useState<boolean>(false)
  const [activeCitation, setActiveCitation] = useState<Citation>()
  const [isCitationPanelOpen, setIsCitationPanelOpen] = useState<boolean>(false)
  const [isIntentsPanelOpen, setIsIntentsPanelOpen] = useState<boolean>(false)
  const abortFuncs = useRef([] as AbortController[])
  const [showAuthMessage, setShowAuthMessage] = useState<boolean | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [execResults, setExecResults] = useState<ExecResults[]>([])
  const [processMessages, setProcessMessages] = useState<messageStatus>(messageStatus.NotRunning)
  const [clearingChat, setClearingChat] = useState<boolean>(false)
  const [hideErrorDialog, { toggle: toggleErrorDialog }] = useBoolean(true)
  const [errorMsg, setErrorMsg] = useState<ErrorMessage | null>()
  const [answerId, setAnswerId] = useState<string>('')

  const errorDialogContentProps = { type: DialogType.close, title: errorMsg?.title, closeButtonAriaLabel: 'Close', subText: errorMsg?.subtitle }
  const modalProps = { titleAriaId: 'labelId', subtitleAriaId: 'subTextId', isBlocking: true, styles: { main: { maxWidth: 450 } } }

  const [ASSISTANT, TOOL, ERROR] = ['assistant', 'tool', 'error']
  const NO_CONTENT_ERROR = 'No content in messages object.'

  useEffect(() => {
    if (
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.Working &&
      appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured &&
      appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Fail &&
      hideErrorDialog
    ) {
      let subtitle = `${appStateContext.state.isCosmosDBAvailable.status}. Please contact the site administrator.`
      setErrorMsg({ title: 'Chat history is not enabled', subtitle })
      toggleErrorDialog()
    }
  }, [appStateContext?.state.isCosmosDBAvailable])

  const handleErrorDialogClose = () => { toggleErrorDialog(); setTimeout(() => setErrorMsg(null), 500) }

  useEffect(() => setIsLoading(appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading),
    [appStateContext?.state.chatHistoryLoadingState])

  const getUserInfoList = async () => {
    if (!AUTH_ENABLED) { setShowAuthMessage(false); return }
    const userInfoList = await getUserInfo()
    if (userInfoList.length === 0 && window.location.hostname !== '127.0.0.1') setShowAuthMessage(true)
    else setShowAuthMessage(false)
  }

  let assistantMessage = {} as ChatMessage
  let toolMessage = {} as ChatMessage
  let assistantContent = ''

  useEffect(() => parseExecResults(execResults), [execResults])
  const parseExecResults = (exec_results_: any): void => {
    if (exec_results_ == undefined) return
    const exec_results = exec_results_.length === 2 ? exec_results_ : exec_results_.splice(2)
    appStateContext?.dispatch({ type: 'SET_ANSWER_EXEC_RESULT', payload: { answerId: answerId, exec_result: exec_results } })
  }

  const processResultMessage = (resultMessage: ChatMessage, userMessage: ChatMessage, conversationId?: string) => {
    if (typeof resultMessage.content === "string" && resultMessage.content.includes('all_exec_results')) {
      const parsedExecResults = JSON.parse(resultMessage.content) as AzureSqlServerExecResults
      setExecResults(parsedExecResults.all_exec_results)
      assistantMessage.context = JSON.stringify({ all_exec_results: parsedExecResults.all_exec_results })
    }
    if (resultMessage.role === ASSISTANT) {
      setAnswerId(resultMessage.id)
      assistantContent += resultMessage.content
      assistantMessage = { ...assistantMessage, ...resultMessage }
      assistantMessage.content = assistantContent
      if (resultMessage.context) {
        toolMessage = { id: uuid(), role: TOOL, content: resultMessage.context, date: new Date().toISOString() }
      }
    }
    if (resultMessage.role === TOOL) toolMessage = resultMessage

    if (!conversationId) {
      isEmpty(toolMessage)
        ? setMessages([...messages, userMessage, assistantMessage])
        : setMessages([...messages, userMessage, toolMessage, assistantMessage])
    } else {
      isEmpty(toolMessage)
        ? setMessages([...messages, assistantMessage])
        : setMessages([...messages, toolMessage, assistantMessage])
    }
  }

  const makeApiRequestWithoutCosmosDB = async (question: ChatMessage["content"], conversationId?: string) => {
    // … (unchanged logic)
    // Keep your existing implementation from your current file.
  }

  const makeApiRequestWithCosmosDB = async (question: ChatMessage["content"], conversationId?: string) => {
    // … (unchanged logic)
    // Keep your existing implementation from your current file.
  }

  const clearChat = async () => {
    // … (unchanged logic)
  }

  const tryGetRaiPrettyError = (errorMessage: string) => {
    // … (unchanged logic)
  }

  const parseErrorMessage = (errorMessage: string) => {
    // … (unchanged logic)
  }

  const newChat = () => {
    // … (unchanged logic)
  }

  const stopGenerating = () => {
    // … (unchanged logic)
  }

  useEffect(() => {
    if (appStateContext?.state.currentChat) setMessages(appStateContext.state.currentChat.messages)
    else setMessages([])
  }, [appStateContext?.state.currentChat])

  useLayoutEffect(() => {
    // … (unchanged logic)
  }, [processMessages])

  useEffect(() => { if (AUTH_ENABLED !== undefined) getUserInfoList() }, [AUTH_ENABLED])

  useLayoutEffect(() => { chatMessageStreamEnd.current?.scrollIntoView({ behavior: 'smooth' }) },
    [showLoadingMessage, processMessages])

  const onShowCitation = (citation: Citation) => { setActiveCitation(citation); setIsCitationPanelOpen(true) }
  const onShowExecResult = (answerId: string) => { setIsIntentsPanelOpen(true) }
  const onViewSource = (citation: Citation) => { if (citation.url && !citation.url.includes('blob.core')) window.open(citation.url, '_blank') }

  const parseCitationFromMessage = (message: ChatMessage) => {
    if (message?.role === 'tool' && typeof message?.content === "string") {
      try { return (JSON.parse(message.content) as ToolMessageContent).citations } catch { return [] }
    }
    return []
  }
  const parsePlotFromMessage = (message: ChatMessage) => {
    if (message?.role === 'tool' && typeof message?.content === "string") {
      try {
        const execResults = JSON.parse(message.content) as AzureSqlServerExecResults
        const codeExecResult = execResults.all_exec_results.at(-1)?.code_exec_result
        return codeExecResult === undefined ? null : codeExecResult.toString()
      } catch { return null }
    }
    return null
  }

  const disabledButton = () =>
    isLoading || (messages && messages.length === 0) || clearingChat ||
    appStateContext?.state.chatHistoryLoadingState === ChatHistoryLoadingState.Loading

  return (
    <div className={styles.container} role="main">
      {appStateContext && appStateContext.state.frontendSettings && false /* keep auth empty-state using your current logic if you need it */}
      <Stack horizontal className={styles.chatRoot}>
        <div className={styles.chatContainer}>
          {!messages || messages.length < 1 ? (
            <Stack className={styles.chatEmptyState} horizontalAlign="center" verticalAlign="center" style={{ height: '100%' }}>
              <h1 className={styles.chatEmptyStateTitle}>{ui?.chat_title || 'Anemia Assistant'}</h1>
              {ui?.chat_description && <h2 className={styles.chatEmptyStateSubtitle}>{ui.chat_description}</h2>}
            </Stack>
          ) : (
            <div className={styles.chatMessageStream} style={{ marginBottom: isLoading ? '40px' : '0px' }} role="log">
              {messages.map((answer, index) => (
                <div key={index}>
                  {answer.role === 'user' ? (
                    <div className={styles.chatMessageUser}>
                      <div className={styles.chatMessageUserMessage}>
                        {typeof answer.content === "string" && answer.content
                          ? answer.content
                          : Array.isArray(answer.content)
                            ? <>{answer.content[0].text} <img className={styles.uploadedImageChat} src={answer.content[1].image_url.url} alt="Uploaded Preview" /></>
                            : null}
                      </div>
                    </div>
                  ) : answer.role === 'assistant' ? (
                    <div className={styles.chatMessageGpt}>
                      {typeof answer.content === "string" && (
                        <Answer
                          answer={{
                            answer: answer.content,
                            citations: parseCitationFromMessage(messages[index - 1]),
                            generated_chart: parsePlotFromMessage(messages[index - 1]),
                            message_id: answer.id,
                            feedback: answer.feedback,
                            exec_results: execResults
                          }}
                          onCitationClicked={c => onShowCitation(c)}
                          onExectResultClicked={() => onShowExecResult(answerId)}
                        />
                      )}
                    </div>
                  ) : answer.role === 'error' ? (
                    <div className={styles.chatMessageError}>
                      <Stack horizontal verticalAlign="center" style={{ gap: 8 }}>
                        <ErrorCircleRegular aria-hidden style={{ color: '#b91c1c' }} />
                        <span>Error</span>
                      </Stack>
                      <div style={{ marginTop: 6 }}>
                        {typeof answer.content === "string" && answer.content}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              {showLoadingMessage && (
                <div className={styles.chatMessageGpt}>
                  <Answer
                    answer={{ answer: "Generating answer...", citations: [], generated_chart: null }}
                    onCitationClicked={() => null}
                    onExectResultClicked={() => null}
                  />
                </div>
              )}
              <div ref={chatMessageStreamEnd} />
            </div>
          )}

          {/* Composer */}
          <Stack horizontal className={styles.chatInput}>
            {isLoading && messages.length > 0 && (
              <Stack horizontal className={styles.stopGeneratingContainer}
                    role="button" aria-label="Stop generating" tabIndex={0}
                    onClick={stopGenerating}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? stopGenerating() : null)}>
                <SquareRegular className={styles.stopGeneratingIcon} aria-hidden />
                <span className={styles.stopGeneratingText} aria-hidden>Stop generating</span>
              </Stack>
            )}
            <Stack>
              {appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured && (
                <CommandBarButton role="button"
                  className={styles.newChatIcon}
                  iconProps={{ iconName: 'Add' }}
                  styles={{ root: { background: 'linear-gradient(135deg, #0ea5a6, #4361ee)', color: '#fff' }, icon: { color: '#fff' } }}
                  onClick={() => { setMessages([]); appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null }) }}
                  disabled={disabledButton()} aria-label="start a new chat" />
              )}
              <CommandBarButton role="button"
                className={appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured ? styles.clearChatBroom : styles.clearChatBroomNoCosmos}
                iconProps={{ iconName: 'Broom' }}
                styles={{ root: { background: 'linear-gradient(135deg, #4361ee, #7c3aed)', color: '#fff' }, icon: { color: '#fff' } }}
                onClick={() => { if (appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured) { /* keep your clearChat */ } else { setMessages([]); appStateContext?.dispatch({ type: 'UPDATE_CURRENT_CHAT', payload: null }) } }}
                disabled={disabledButton()} aria-label="clear chat" />
            </Stack>

            <QuestionInput
              clearOnSend
              placeholder="Ask about anemia labs, thresholds, pathways…"
              disabled={isLoading}
              onSend={(question, id) => {
                appStateContext?.state.isCosmosDBAvailable?.cosmosDB
                  ? makeApiRequestWithCosmosDB(question, id)
                  : makeApiRequestWithoutCosmosDB(question, id)
              }}
              conversationId={appStateContext?.state.currentChat?.id ? appStateContext?.state.currentChat?.id : undefined}
            />
          </Stack>
        </div>

        {/* Right side: panels */}
        {messages && messages.length > 0 && isCitationPanelOpen && activeCitation && (
          <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Citations Panel">
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <span style={{ fontWeight: 700 }}>Citations</span>
              <IconButton iconProps={{ iconName: 'Cancel' }} aria-label="Close citations panel" onClick={() => setIsCitationPanelOpen(false)} />
            </Stack>
            <h5
              className={styles.citationPanelTitle}
              tabIndex={0}
              title={activeCitation.url && !activeCitation.url.includes('blob.core') ? activeCitation.url : activeCitation.title ?? ''}
              onClick={() => onViewSource(activeCitation)}>
              {activeCitation.title}
            </h5>
            <div tabIndex={0}>
              <ReactMarkdown
                linkTarget="_blank"
                className={styles.citationPanelContent}
                children={DOMPurify.sanitize(activeCitation.content, { ALLOWED_TAGS: XSSAllowTags })}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              />
            </div>
          </Stack.Item>
        )}

        {messages && messages.length > 0 && isIntentsPanelOpen && (
          <Stack.Item className={styles.citationPanel} tabIndex={0} role="tabpanel" aria-label="Intents Panel">
            {/* keep your current intents panel content */}
          </Stack.Item>
        )}

        {appStateContext?.state.isChatHistoryOpen &&
          appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured && <ChatHistoryPanel />}
      </Stack>
    </div>
  )
}

export default Chat
