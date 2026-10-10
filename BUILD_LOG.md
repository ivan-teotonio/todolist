# BUILD_LOG.md — Mobile To-Do App

Histórico real de desenvolvimento do projeto. Entradas acrescentadas
incrementalmente, sem reescrever entradas anteriores.

---

## 2026-10-09 — Entrada 01: Leitura da especificação e decisão de stack

### Prompt / Request

> Leia o arquivo docs/SPEC.md e implemente os requisitos definidos nele.

### Decision Summary

- Li `docs/SPEC.md` na íntegra (21 seções + critérios de aceitação).
- Workspace continha apenas `docs/SPEC.md`; projeto será criado do zero.
- Decidi implementar com **Flutter (Dart)**, por ser o framework mobile
  padrão para este tipo de trabalho (SQLite + notificações locais +
  navegação entre telas), com build Android/iOS real.
- Bibliotecas planejadas: `provider` (estado), `sqflite` (SQLite),
  `flutter_local_notifications` + `timezone` (notificações agendadas),
  `intl` (formatação de data/hora), `path` (caminho do banco).
- Arquitetura planejada: organização por camadas
  `models → data → repositories → providers → screens/widgets`,
  com `ChangeNotifier` + `Provider` para estado.
- Ambiente: WSL Linux sem Flutter Linux instalado (só existe um SDK
  Windows em `/mnt/c/Users/Ivan/flutter`, inutilizável no Linux).
  Vou baixar o Flutter Linux 3.47.7 estável em `/tmp/opencode/flutter-sdk`.

### Actions Performed

- Inspecionado workspace (`/mnt/c/Users/Ivan/Documents/ddm`) e toolchain
  (`node`, `flutter`, `java`, Android SDK).
- Iniciado download do Flutter SDK Linux em background.
- Criado este `BUILD_LOG.md`.

### Result

- Decisão de stack registrada; download em andamento.

### Problems / Errors

- `flutter` do PATH é instalação Windows (`.bat`/`.exe`, scripts com CRLF);
  `java` não existe no Linux (só via mount Windows). Impede build imediato.

### Fixes Attempted

- Optado por instalar Flutter Linux dedicado em `/tmp/opencode/flutter-sdk`
  em vez de tentar reaproveitar o SDK Windows.

### Current Status

- Partially completed (setup em andamento)

---

## 2026-10-09 — Entrada 02: Modelos, SQLite, repositórios e estado

### Prompt / Request

> Leia o arquivo docs/SPEC.md e implemente os requisitos definidos nele.
> (continuação — implementação dos dados e da lógica)

### Decision Summary

- Modelo `Task`: exatamente os 7 campos da SPEC (`id`, `title`,
  `description`, `completed`, `dueDateTime`, `createdAt`, `categoryId`),
  sem campos extras. O id da notificação é o próprio `task.id`, logo
  nenhuma coluna adicional foi necessária.
- Modelo `Category`: `id`, `name` + campo extra `color` (ARGB int, permitido
  pela SPEC) para um ponto colorido na UI.
- Persistência: `sqflite` com SQL direto (sem ORM), singleton
  `DatabaseHelper`, tabelas `tasks` e `categories`, FK
  `categoryId → categories(id) ON DELETE SET NULL` + `PRAGMA foreign_keys`.
  Alternativa considerada (drift/ORM com codegen) foi descartada por
  complexidade desnecessária para um app educacional pequeno.
- Estratégia de exclusão de categoria: tasks passam a `categoryId = NULL`
  (uncategorized); nenhuma task é apagada. Repositório ainda atualiza
  explicitamente antes do delete para não depender só do pragma.
- Seed de categorias padrão (Personal, Work, Study, Shopping) no `onCreate`.
- Estado: `provider` + `ChangeNotifier` (`TaskProvider`, `CategoryProvider`).
  Alternativas (Riverpod, Bloc) descartadas por boilerplate maior.
- Filtragem: em memória no provider via função pura `filterTasks`
  (status + categoria), em vez de queries SQL — reativa, instantânea e
  unit-testável sem platform channels.
- Navegação: `Navigator` 1.0 com rotas nomeadas; editor recebe **só o id**
  (`arguments: int?`, null = criar) e lê a task do provider (fonte única).

### Actions Performed

- Criados `pubspec.yaml` (provider, sqflite, path, intl, timezone,
  flutter_timezone, flutter_local_notifications) e `analysis_options.yaml`.
- Criados `lib/models/task.dart`, `lib/models/category.dart`,
  `lib/data/database_helper.dart`,
  `lib/repositories/task_repository.dart`,
  `lib/repositories/category_repository.dart`,
  `lib/providers/task_provider.dart` (CRUD, toggle, filtros, função pura
  `filterTasks`), `lib/providers/category_provider.dart`.
- Criados `test/model_test.dart` e `test/task_filter_test.dart`.

### Result

- Código escrito; compilação/validação pendente do SDK Flutter Linux
  (download em andamento).

### Problems / Errors

- Nenhum erro até aqui (sem compilador disponível ainda).

### Fixes Attempted

- N/A.

### Current Status

- Needs testing

---

## 2026-10-09 — Entrada 03: Notificações, telas e navegação

### Prompt / Request

> Leia o arquivo docs/SPEC.md e implemente os requisitos definidos nele.
> (continuação — notificações e UI)

### Decision Summary

- Notificações locais com `flutter_local_notifications` + `timezone` +
  `flutter_timezone` (fuso local real do aparelho, com fallback silencioso).
- Sem servidor push; canal Android `task_reminders` (alta importância).
- Regras implementadas em `NotificationService.scheduleForTask` (idempotente:
  agenda só se task tem id + futura + pendente; caso contrário cancela):
  criar com data futura agenda; alterar data cancela a antiga e agenda nova;
  remover data cancela; concluir cancela; reabrir reagenda se ainda futura;
  excluir cancela. `resyncAll` no startup restaura lembretes após
  reiniciar o app/dispositivo (limitação conhecida: o SO limpa alarmes no
  reboot; reabrir o app os restaura — documentado como limitação).
- Permissão: solicitada no `init` (Android 13+ e iOS/macOS), mais
  `requestExactAlarmsPermission` (best effort). Negação apenas desativa
  agendamento (`granted = false`); app nunca trava.
- Telas: `TaskListScreen` (chips All/Pending/Completed + dropdown de
  categoria + FAB + atalho de categorias), `TaskEditorScreen` (form com
  título obrigatório, descrição, categoria opcional, data/hora opcional com
  validação de futuro, switch de concluída, salvar/cancelar/excluir com
  confirmação), `CategoryManagementScreen` (listar/criar/renomear/excluir
  com aviso de tasks vinculadas).
- Erros: título vazio e data passada validados no form/provider
  (`ArgumentError` → SnackBar); erros de SQLite e de agendamento viram
  mensagens sem crash.

### Actions Performed

- Criados `lib/services/notification_service.dart`,
  `lib/widgets/task_tile.dart`, `lib/screens/task_list_screen.dart`,
  `lib/screens/task_editor_screen.dart`,
  `lib/screens/category_management_screen.dart`, `lib/main.dart`.
- Ajustado `DropdownButtonFormField` de `initialValue` para `value`
  (parâmetro válido em todas as versões recentes do Flutter).

### Result

- App completo no papel; validação (analyze/test/build) pendente do SDK.

### Problems / Errors

- Sem compilador ainda; APIs conferidas por conhecimento (revalidar com
  `flutter analyze` assim que o SDK estiver pronto).

### Fixes Attempted

- N/A.

### Current Status

- Needs testing

---

## 2026-10-09 — Entrada 04: Correção de stack — React Native com Expo

### Prompt / Request

> o app era pra ser feito em reactive native com expo

### Decision Summary

- Correção de rumo: o usuário informou que o app deve ser feito em
  **React Native com Expo**, não em Flutter. As entradas 01–03 ficam
  preservadas como histórico (decisão errada registrada, não apagada).
- Nova stack: Expo (TypeScript) + `expo-sqlite` (persistência, SQL direto),
  `expo-notifications` (locais agendadas), `@react-navigation/native-stack`
  (navegação), `@react-native-community/datetimepicker` (data/hora),
  estado com React Context + hooks (sem lib externa de estado).
- Arquitetura: `src/types → db → notifications → state → screens`.
  Filtragem em memória via `useMemo` + função pura `filterTasks`
  (testável sem módulos nativos).
- Notificações: `scheduleNotificationAsync` retorna um identifier opaco;
  por isso a task ganha o campo extra `notificationId` (documentado abaixo).
  Identifier antigo é sempre cancelado antes de reagendar.
- Navegação passa só o `taskId` (`TaskEditor: { taskId?: number }`).

### Actions Performed

- Removidos artefatos Flutter (`lib/`, `test/`, `pubspec.yaml`,
  `analysis_options.yaml`); mantidos `docs/`, `BUILD_LOG.md`, `README.md`.
- Download do Flutter SDK descartado (parcial, removido de `/tmp`).
- Iniciado scaffold base (`create-expo-app --template blank-typescript`)
  em `/tmp/opencode/expo-base` para herdar versões compatíveis do SDK.

### Result

- Pivot em andamento; código Expo a seguir.

### Problems / Errors

- Trabalho Flutter das entradas 01–03 descartado por requisito do usuário
  (stack incorreta). Nenhum erro técnico.

### Fixes Attempted

- N/A.

### Current Status

- Partially completed (reimplementação em Expo)

---

## 2026-10-09 — Entrada 05: Implementação Expo — dados, estado, telas

### Prompt / Request

> o app era pra ser feito em reactive native com expo
> (continuação — implementação completa na nova stack)

### Decision Summary

- Base `blank-typescript` do `create-expo-app` (Expo SDK 57, React 19,
  RN 0.86) para herdar versões compatíveis; deps adicionadas:
  `expo-sqlite` (persistência), `expo-notifications` (locais),
  `@react-navigation/native` + `native-stack` + `react-native-screens` +
  `react-native-safe-area-context` (navegação),
  `@react-native-community/datetimepicker` (data/hora),
  `jest` + `jest-expo` + `@types/jest` (testes).
- Estado sem lib externa: React Context + hooks (`AppProvider`);
  alternativas (Redux/Zustand) descartadas por boilerplate.
- Campos extras documentados: `Task.notificationId` (identifier opaco do
  Expo, necessário p/ cancelar o lembrete exato) e `Category.color` (hex).
- Filtragem em memória (`filterTasks` pura + `useMemo`); navegação passa
  só o `taskId`; exclusão de categoria torna tasks uncategorized
  (`detachCategoryFromTasks` + FK `ON DELETE SET NULL`, belt & braces).
- Notificações: canal Android `task_reminders`, permissão runtime no
  startup (`app.json` declara `POST_NOTIFICATIONS`/`SCHEDULE_EXACT_ALARM`
  via plugin `expo-notifications`), `syncReminderForTask` idempotente,
  resync no startup. Negação = lembretes desativados, sem crash.
- UI sem lib de componentes (só primitivos RN + StyleSheet) para manter
  o app leve; filtros por chips (status + categoria, sem dep de picker).

### Actions Performed

- Copiados do scaffold: `index.ts`, `tsconfig.json`, `.gitignore`,
  `assets/`; escritos `package.json`, `app.json`, `babel.config.js`.
- Criados `App.tsx`, `src/types.ts`, `src/utils/filter.ts`,
  `src/db/database.ts`, `src/db/taskRepository.ts`,
  `src/db/categoryRepository.ts`,
  `src/notifications/notifications.ts`, `src/state/AppContext.tsx`,
  `src/navigation/types.ts`, `src/components/TaskItem.tsx`,
  telas `TaskListScreen`, `TaskEditorScreen`, `CategoryManagementScreen`.
- Criados `__tests__/filter.test.ts`, `__tests__/types.test.ts`.
- Reescrito `README.md` para a stack Expo.
- `npm install` em andamento.

### Result

- Código completo; validação (`tsc`, `jest`) pendente do install.

### Problems / Errors

- Nenhum até aqui.

### Fixes Attempted

- N/A.

### Current Status

- Needs testing

---

## 2026-10-09 — Entrada 06: Validação e revisão final

### Prompt / Request

> (validação do projeto Expo — SPEC §19–§21)

### Decision Summary

- Validação sem emulador disponível no Linux (Android SDK existe só no
  lado Windows): `tsc --noEmit`, `jest`, `expo-doctor` e `expo export`
  (bundle Android real via Metro).
- `expo install --fix` aplicado para alinhar `jest`, `@types/jest`,
  `datetimepicker`, `safe-area-context` e `screens` às versões esperadas
  pelo SDK 57.
- `tsconfig.json` ganhou `"types": ["jest", "node"]` porque o TS 6 não
  incluiu os globals do jest automaticamente.
- Conferência dos critérios de aceitação (§20) abaixo — itens de
  comportamento em aparelho real marcados como "Needs testing".

### Actions Performed

- `npx tsc --noEmit` → limpo, 0 erros.
- `npx jest` → 2 suites, 9/9 testes passando (filtros + regras de data).
- `npx expo-doctor` → 21/21 checks passando.
- `npx expo export --platform android` → bundle `index-*.hbc` (2.1MB)
  gerado com sucesso.
- Removidos `/tmp/opencode/export-test` e `/tmp/opencode/expo-base`.

### Result

- Projeto válido estaticamente e com bundle Android gerado.
- Checklist §20: builds ✓, types ✓, testes lógicos ✓, export ✓;
  tasks CRUD, categorias CRUD, filtros, navegação, datas, notificações
  (agendar/atualizar/cancelar), permissão e persistência implementados
  conforme SPEC; execução em aparelho/emulador pendente de teste real.

### Problems / Errors

- `tsc` não achava `describe/it/expect` (TS 6 + globals do jest).
  Fix: `"types": ["jest", "node"]` no `tsconfig.json` → resolvido.
- `expo-doctor` acusou 5 pacotes fora da versão esperada (jest 30,
  datetimepicker 9.2.1 etc.). Fix: `npx expo install --fix` → 21/21 ok;
  `tsc` + `jest` reexecutados após o fix, tudo verde.

### Current Status

- Needs testing (em dispositivo/emulador real)

---

## Revisão final (SPEC §21)

- Arquitetura: camadas `types → db → notifications → state → screens`,
  com repositórios finos sobre `expo-sqlite` (SQL direto, sem ORM).
- Dependências importantes: `expo-sqlite`, `expo-notifications`,
  `@react-navigation/native(-stack)`, `react-native-screens`,
  `react-native-safe-area-context`,
  `@react-native-community/datetimepicker`, `jest`/`jest-expo` (dev).
- SQLite: singleton `getDatabase()`, tabelas `tasks`/`categories`, FK
  `ON DELETE SET NULL` + `detachCategoryFromTasks`; seed de 4 categorias.
- Estado: React Context + hooks (`AppProvider`), filtros em memória
  (`filterTasks` pura + `useMemo`), UI atualiza a cada mutação.
- Navegação: native-stack (`TaskList`/`TaskEditor`/`Categories`); editor
  recebe só `{ taskId?: number }`.
- Notificações: locais via `expo-notifications`, identifier opaco
  persistido em `tasks.notificationId`; `syncReminderForTask` idempotente
  (criar agenda, alterar reagenda, remover/concluir/excluir cancela,
  reabrir reagenda se futura); `resyncAll` no startup; permissão runtime
  com degradação graciosa.
- Limitações conhecidas: sem teste em aparelho/emulador neste ambiente
  (requer Expo Go ou `expo run:android`); entrega exata do alarme em
  Android 12+ e resync pós-reboot dependem do SO e precisam de teste real;
  sem suporte a web (módulos nativos).
- Bugs restantes conhecidos: nenhum detectado na validação estática.

---

## 2026-10-09 — Entrada 07: Erro EACCES no `expo start` (Windows)

### Prompt / Request

> $ npx expo start -c ... Error: EACCES: permission denied, lstat
> 'C:\Users\Ivan\Documents\ddm\node_modules\.bin\.acorn-hO8KXDUu'

### Decision Summary

- Causa: `node_modules` havia sido instalado pelo Linux (WSL); os
  symlinks/shims do `.bin` criados pelo npm Linux não são legíveis pelo
  watcher do Metro no Windows (FallbackWatcher → `lstat` EACCES em
  arquivos de staging `.acorn-XXXX`).
- Fix: apagar `node_modules` e reinstalar de forma nativa no Windows
  (`npm install` via `cmd.exe`), mantendo o `package-lock.json` para
  preservar as versões aprovadas pelo `expo-doctor` (21/21).
- Código-fonte não muda; é problema puramente de ambiente.

### Actions Performed

- Removido `node_modules/` (instalação Linux).
- Iniciado `npm install` nativo do Windows em background.

### Result

- Aguardando conclusão do install no Windows; depois validar com
  `npx expo start -c` no PowerShell/CMD.

### Problems / Errors

- EACCES no Metro watcher (Windows) conforme report do usuário.

### Fixes Attempted

- Reinstalação nativa no Windows (em andamento).

### Current Status

- Needs testing (aguardando `npm install` do Windows)

---

## 2026-10-09 — Entrada 08: Reinstalação Windows concluída

### Prompt / Request

> (continuação da entrada 07 — conclusão do `npm install` nativo)

### Decision Summary

- Mantida a estratégia da entrada 07; nenhuma mudança de código.

### Actions Performed

- `npm install` via `cmd.exe` concluído: 459 pacotes, `.bin` com shims
  Windows (`.cmd`/`.ps1`), zero arquivos de staging (`.*`).
- `npx tsc --noEmit` executado no Windows → 0 erros.

### Result

- Toolchain Windows íntegro; `npx expo start -c` liberado para o usuário
  no PowerShell/CMD.

### Problems / Errors

- Nenhum após a reinstalação.

### Fixes Attempted

- N/A.

### Current Status

- Needs testing (`expo start` + teste em aparelho/emulador pelo usuário)

---

## 2026-10-09 — Entrada 09: Erro expo-notifications no Expo Go (Android)

### Prompt / Request

> Error: expo-notifications Android push notifications (remote
> notifications functionality provided by expo-notifications was removed
> from expo go with the release of sdk ...)

### Decision Summary

- Causa raiz (confirmada no código instalado): `DevicePushTokenAutoRegistration.fx`
  executa `addPushTokenListener()` no escopo do módulo; essa função chama
  `warnOfExpoGoPushUsage()`, que faz `throw` no Android dentro do Expo Go.
  Ou seja, o `import` estático de `expo-notifications` quebra o app no
  Expo Go/Android já na avaliação do módulo — antes de qualquer uso.
  Nosso app nunca chama APIs de push (só locais), mas o side effect do
  import atingia do mesmo jeito.
- Fix: (1) `import` dinâmico de `expo-notifications` com try/catch;
  (2) detecção de Expo Go no Android via `expo-constants`
  (`Constants.appOwnership === 'expo'`) para nem tentar importar —
  lembretes desativados com aviso na UI, resto do app 100% funcional;
  (3) nova dep `expo-constants ~57.0.21`; (4) banner na TaskList quando
  `remindersSupported === false`; (5) contexto expõe `remindersSupported`.
- Alternativas: exigir development build sempre (descartado — o app deve
  rodar no Expo Go; lembretes locais no iOS/Go e em dev builds continuam
  funcionando). Para testar notificações de verdade no Android, usar
  `npx expo run:android` (dev build).

### Actions Performed

- Reescrito `src/notifications/notifications.ts` (import dinâmico,
  `areRemindersSupported()`, skip no Expo Go/Android).
- `src/state/AppContext.tsx`: estado `remindersSupported` exposto.
- `src/screens/TaskListScreen.tsx`: aviso quando lembretes desativados.
- `npx expo install expo-constants` (lado Windows).
- Validação no Windows: `tsc` limpo, `jest` 9/9, `expo-doctor` 21/21,
  `expo export --platform android` com bundle gerado.

### Result

- App abre no Expo Go/Android sem redbox; lembretes locais seguem
  funcionando em dev builds e (iOS) no Expo Go.

### Problems / Errors

- Erro original do usuário (throw no import dentro do Expo Go/Android).

### Fixes Attempted

- Import dinâmico + detecção de Expo Go + degradação graciosa (ok);
  development build documentado como caminho p/ notificações no Android.

### Current Status

- Needs testing (fluxo de lembrete em dev build / aparelho real)
