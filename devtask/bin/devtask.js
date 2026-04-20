#!/usr/bin/env node
import { Command } from 'commander'
import { cmdAdd }    from '../src/commands/add.js'
import { cmdList }   from '../src/commands/list.js'
import { cmdNext }   from '../src/commands/next.js'
import { cmdDone }   from '../src/commands/done.js'
import { cmdEdit }   from '../src/commands/edit.js'
import { cmdDelete } from '../src/commands/delete.js'
// import { cmdSync } from '../src/commands/sync.js'  // v2.0

const program = new Command()

program
  .name('devtask')
  .description('開発者向けタスク管理CLI — 優先度を自動調整')
  .version('1.0.0')

// add
program
  .command('add <text>')
  .description('タスクを追加（優先度は自動判定）')
  .option('-p, --priority <level>', '優先度を手動指定 (high/medium/low)')
  .option('-d, --due <date>',       '締め切り (today/tomorrow/fri/next-week/YYYY-MM-DD)')
  .option('-t, --tag <tags>',       'タグ (カンマ区切り: auth,backend。最大5件・各20文字以内)')
  .action(cmdAdd)

// list
program
  .command('list')
  .alias('ls')
  .description('タスク一覧を表示')
  .option('-s, --status <status>',   'フィルター (all/active/done)', 'active')
  .option('-p, --priority <level>',  '優先度フィルター (high/medium/low/all)', 'all')
  .option('-t, --tag <tag>',         'タグフィルター')
  .option('-r, --reason',            '優先度の理由を表示')
  .action(cmdList)

// next
program
  .command('next')
  .description('今やるべきタスクをスコアリングして表示')
  .option('-n, --limit <num>', '表示件数 (1〜50)', '5')
  .action(cmdNext)

// done
program
  .command('done <id>')
  .description('タスクを完了にする')
  .action(cmdDone)

// edit
program
  .command('edit <id>')
  .description('タスクを編集')
  .option('--text <text>',          'テキストを変更')
  .option('-p, --priority <level>', '優先度を変更 (high/medium/low)')
  .option('-d, --due <date>',       '締め切りを変更')
  .option('-t, --tag <tags>',       'タグを変更 (カンマ区切り)')
  .action(cmdEdit)

// delete
program
  .command('delete <id>')
  .alias('rm')
  .description('タスクを削除')
  .action(cmdDelete)

program.parse()
