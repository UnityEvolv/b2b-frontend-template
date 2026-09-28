import { describe, expect, it } from 'vitest'

import { errorReport, guessMapping, isSheet, mappingJson } from './import'

describe('guessMapping', () => {
  it('matches the headers people actually use', () => {
    expect(guessMapping(['Full Name', 'E-mail', 'Access level'])).toEqual({
      email: 'E-mail',
      name: 'Full Name',
      role: 'Access level',
    })
  })
  it('prefers an exact match and uses each column once', () => {
    expect(guessMapping(['Manager email', 'Email', 'Name'])).toEqual({
      email: 'Email',
      name: 'Name',
      role: '',
    })
  })
  it('leaves a field empty when nothing fits', () => {
    expect(guessMapping(['Column A', 'Column B'])).toEqual({ email: '', name: '', role: '' })
  })
})

describe('mappingJson', () => {
  it('sends only the fields chosen', () => {
    expect(mappingJson({ email: 'E-mail', name: 'Full name', role: '' })).toBe(
      '{"email":"E-mail","name":"Full name"}',
    )
  })
})

describe('errorReport', () => {
  it('lists only failed rows, quoting what needs it', () => {
    const csv = errorReport(
      [
        { row: 2, email: 'ada@example.com', name: 'Ada', status: 'would_invite', errors: [] },
        {
          row: 3,
          email: 'bob',
          name: 'Bob, Jr',
          status: 'failed',
          errors: [{ code: 'email_invalid', message: 'Not an "address".' }],
        },
      ],
      ['Row', 'Email', 'Name', 'Role', 'Problems'],
    )
    expect(csv).toBe('Row,Email,Name,Role,Problems\r\n3,bob,"Bob, Jr",,"Not an ""address""."\r\n')
  })
})

describe('isSheet', () => {
  it('takes CSV and XLSX only', () => {
    expect(isSheet(new File([''], 'people.XLSX'))).toBe(true)
    expect(isSheet(new File([''], 'people.csv'))).toBe(true)
    expect(isSheet(new File([''], 'people.xls'))).toBe(false)
  })
})
