import { Brand, Card, Spinner } from '@unityevolv/unitykit'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** The frame around every public account page: the brand, a title, a card. */
export function PublicCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-base-100 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand product="unityofis" />
        </div>
        <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
        {children}
      </Card>
    </main>
  )
}

export function PublicLoading() {
  const { t } = useTranslation()
  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-base-100 p-4">
      <Spinner block size="lg" label={t('loading')} />
    </main>
  )
}
