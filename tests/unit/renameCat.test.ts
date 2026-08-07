/**
 * Unit coverage for the two pure decisions inside
 * `scripts/migration/rename-cat.js` (2026-08-04).
 *
 * 🔑 A rename cascade is run once, against production, on data nobody has a
 * second copy of — and both of these functions have a failure mode that is
 * invisible in a dry-run summary. `rewriteTokens` over-matching would rewrite
 * prose; `rewriteTags` mishandling a duplicate would leave a tag array the
 * album's `array-contains` still matches but the tagging editor shows twice.
 * The counts printed by the script are only as trustworthy as these.
 */
import { describe, it, expect } from 'vitest';

// The script is a CommonJS migration script, not a module of the app.
const {
  rewriteTokens,
  rewriteTags,
  rewriteNameList,
} = require('../../scripts/migration/rename-cat.js');

describe('rewriteTokens', () => {
  it('rewrites the token and reports how many it changed', () => {
    const { text, count } = rewriteTokens(
      '오늘은 [catmodal:아롱이]와 [catmodal:아롱이]를 만났어요.',
      '아롱이',
      '다롱이'
    );

    expect(text).toBe('오늘은 [catmodal:다롱이]와 [catmodal:다롱이]를 만났어요.');
    expect(count).toBe(2);
  });

  it('leaves the bare name alone — only the token is a link', () => {
    // ⚠️ The case that makes a naive replace destructive: 별이 is both a cat and
    // an ordinary word, and rewriting the prose would silently edit posts.
    const { text, count } = rewriteTokens(
      '별이는 별이 빛나는 밤에 왔어요. [catmodal:별이]',
      '별이',
      '달이'
    );

    expect(text).toBe('별이는 별이 빛나는 밤에 왔어요. [catmodal:달이]');
    expect(count).toBe(1);
  });

  it('does not touch another cat’s token', () => {
    const { text, count } = rewriteTokens('[catmodal:아롱이몬]', '아롱이', '다롱이');
    expect(text).toBe('[catmodal:아롱이몬]');
    expect(count).toBe(0);
  });

  it('does not match a token that merely contains the name', () => {
    const { count } = rewriteTokens('[catmodal:큰 아롱이]', '아롱이', '다롱이');
    expect(count).toBe(0);
  });

  it('treats a name with regex metacharacters literally', () => {
    // A cat called `아롱(2)` would otherwise compile to a capture group and
    // match `아롱2` — a token belonging to a different cat.
    const { text, count } = rewriteTokens('[catmodal:아롱(2)]', '아롱(2)', '다롱이');
    expect(text).toBe('[catmodal:다롱이]');
    expect(count).toBe(1);
  });

  it('handles missing and empty fields without throwing', () => {
    expect(rewriteTokens(undefined, '아롱이', '다롱이')).toEqual({ text: undefined, count: 0 });
    expect(rewriteTokens('', '아롱이', '다롱이')).toEqual({ text: '', count: 0 });
  });
});

describe('rewriteTags', () => {
  it('replaces the name in place, keeping the rest of the tags and their order', () => {
    expect(rewriteTags(['보리', '아롱이', '까미'], '아롱이', '다롱이')).toEqual([
      '보리',
      '다롱이',
      '까미',
    ]);
  });

  it('returns null when the tag is absent, so the doc is not written at all', () => {
    expect(rewriteTags(['보리', '까미'], '아롱이', '다롱이')).toBeNull();
    expect(rewriteTags(undefined, '아롱이', '다롱이')).toBeNull();
  });

  it('does not duplicate a name the document already carries', () => {
    // Reachable two ways: a re-run after a partial failure, and a hand-typed tag
    // in the tagging editor (that field is free text by design).
    expect(rewriteTags(['아롱이', '다롱이'], '아롱이', '다롱이')).toEqual(['다롱이']);
  });

  it('does not rewrite a tag that merely contains the name', () => {
    expect(rewriteTags(['아롱이몬'], '아롱이', '다롱이')).toBeNull();
  });
});

/**
 * `parents` / `offspring` — free-text cat names shown in the modal's 엄마 / 애
 * rows. Added 2026-08-04 after a production dry run of 아들조로 → 조로 showed
 * `cats/엄마조로` holding `offspring: "아들조로"`, which the cascade was leaving
 * behind.
 */
describe('rewriteNameList', () => {
  it('rewrites a field holding exactly the old name', () => {
    expect(rewriteNameList('아들조로', '아들조로', '조로')).toBe('조로');
  });

  it('returns null when the name is absent, so the doc is not written', () => {
    expect(rewriteNameList('엄마조로', '아들조로', '조로')).toBeNull();
    expect(rewriteNameList('', '아들조로', '조로')).toBeNull();
    expect(rewriteNameList(undefined, '아들조로', '조로')).toBeNull();
  });

  /**
   * ⚠️⚠️ The case that makes this a whole-member match rather than a replace.
   * The real rename is 아들조로 → 조로, and the NEW name is a substring of two
   * existing cats. A `String.replace` here would corrupt both.
   */
  it('never matches a substring — the 조로 trap', () => {
    expect(rewriteNameList('엄마조로', '조로', '깡패')).toBeNull();
    expect(rewriteNameList('아들조로', '조로', '깡패')).toBeNull();
    // And renaming 아들조로 must leave a sibling 엄마조로 entry untouched.
    expect(rewriteNameList('엄마조로,아들조로', '아들조로', '조로')).toBe('엄마조로,조로');
  });

  it('rewrites one member of a comma-separated list and leaves the others', () => {
    // Real shape: cats/예쁜이엄마 → offspring="순돌이,예쁜이,블타".
    expect(rewriteNameList('순돌이,예쁜이,블타', '예쁜이', '이쁜이')).toBe('순돌이,이쁜이,블타');
  });

  it('does not match a longer name that starts with the old one', () => {
    expect(rewriteNameList('예쁜이엄마', '예쁜이', '이쁜이')).toBeNull();
    expect(rewriteNameList('순돌이,예쁜이엄마', '예쁜이', '이쁜이')).toBeNull();
  });

  it('preserves the original separators and spacing', () => {
    expect(rewriteNameList('순돌이, 예쁜이, 블타', '예쁜이', '이쁜이')).toBe(
      '순돌이, 이쁜이, 블타'
    );
    expect(rewriteNameList('  아들조로  ', '아들조로', '조로')).toBe('  조로  ');
  });

  it('rewrites every occurrence when a name is listed twice', () => {
    expect(rewriteNameList('아들조로,깡패,아들조로', '아들조로', '조로')).toBe('조로,깡패,조로');
  });
});
