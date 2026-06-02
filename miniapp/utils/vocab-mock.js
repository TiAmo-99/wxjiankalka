/** 演示模式本地单词数据（无需服务端词库） */
const MOCK_WORDS = [
  { id: 1, word: 'persist', phonetic: 'pərˈsɪst', meaningZh: 'v. 坚持；持续' },
  { id: 2, word: 'profound', phonetic: 'prəˈfaʊnd', meaningZh: 'adj. 深刻的；渊博的' },
  { id: 3, word: 'reluctant', phonetic: 'rɪˈlʌktənt', meaningZh: 'adj. 不情愿的' },
  { id: 4, word: 'subtle', phonetic: 'ˈsʌtl', meaningZh: 'adj. 微妙的；细腻的' },
  { id: 5, word: 'trivial', phonetic: 'ˈtrɪviəl', meaningZh: 'adj. 琐碎的；不重要的' },
  { id: 6, word: 'undermine', phonetic: 'ˌʌndərˈmaɪn', meaningZh: 'v. 削弱；破坏' },
  { id: 7, word: 'valid', phonetic: 'ˈvælɪd', meaningZh: 'adj. 有效的；合理的' },
  { id: 8, word: 'vivid', phonetic: 'ˈvɪvɪd', meaningZh: 'adj. 生动的；鲜明的' },
  { id: 9, word: 'welfare', phonetic: 'ˈwelfer', meaningZh: 'n. 福利；幸福' },
  { id: 10, word: 'yield', phonetic: 'jiːld', meaningZh: 'v. 产生；屈服 n. 产量' },
  { id: 11, word: 'zeal', phonetic: 'ziːl', meaningZh: 'n. 热情；热忱' },
  { id: 12, word: 'ambiguous', phonetic: 'æmˈbɪɡjuəs', meaningZh: 'adj. 模糊的；歧义的' }
]

const MOCK_CORPUS = [
  {
    id: 1,
    kind: 'phrase',
    title: '',
    phraseEn: 'take it for granted',
    meaningZh: '认为…理所当然'
  },
  {
    id: 2,
    kind: 'sentence',
    title: '观点',
    phraseEn:
      'It is widely acknowledged that consistent practice matters more than occasional intensive study.',
    meaningZh: '人们普遍认为，持续练习比偶尔突击更重要。'
  },
  {
    id: 3,
    kind: 'passage',
    title: '阅读·学习',
    phraseEn:
      'Reading English materials every day helps learners notice collocations and sentence patterns that textbooks alone may not provide. Even ten minutes of focused reading can reinforce vocabulary learned from word lists.',
    meaningZh:
      '每天阅读英语材料有助于学习者注意仅靠教材可能无法提供的搭配与句型。哪怕十分钟专注阅读，也能巩固从单词表学到的词汇。'
  }
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function mockVocabPreview(count = 3) {
  const words = shuffle(MOCK_WORDS).slice(0, count)
  return { date: new Date().toISOString().slice(0, 10), words, empty: false }
}

export function mockVocabSet(wordCount = 10) {
  const words = shuffle(MOCK_WORDS).slice(0, Math.min(wordCount, MOCK_WORDS.length))
  const phrase = shuffle(MOCK_CORPUS)[0]
  return { words, phrase, empty: false }
}
