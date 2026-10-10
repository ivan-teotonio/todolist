# Questões de Engenharia Reversa de Aplicativos Móveis

Responda às seguintes perguntas com base no código gerado durante o exercício
Sempre que possível, mencione os arquivos, classes, funções ou componentes relevantes.

---

## 1. Estrutura do Projeto

a) Quais são as principais partes do projeto e onde você pode encontrar:

**Resposta:**

- **Interface do usuário / telas:** `src/screens/TaskListScreen.tsx` (lista + filtros + FAB), `src/screens/TaskEditorScreen.tsx` (criar/editar), `src/screens/CategoryManagementScreen.tsx` (categorias) e `src/components/TaskItem.tsx` (card da tarefa).
- **Modelos de dados:** `src/types.ts` (`Task`, `Category`, `NewTaskInput`, `TaskUpdate`, `StatusFilter`).
- **Código do banco de dados SQLite:** `src/db/database.ts` (`getDatabase()`, tabelas `tasks`/`categories`) + `src/db/taskRepository.ts` e `src/db/categoryRepository.ts` (CRUD via `expo-sqlite`).
- **Navegação:** `App.tsx` (Stack `TaskList` / `TaskEditor` / `Categories`) + `src/navigation/types.ts` (`RootStackParamList`, editor recebe só `taskId`).
- **Código de notificação:** `src/notifications/notifications.ts` (`initNotifications()`, `syncReminderForTask()`, `cancelReminder()` via `expo-notifications`).

## 2. Arquitetura e Estado

Como o estado do aplicativo é gerenciado?

Explique como a interface do usuário é atualizada após uma operação, como:

**Resposta:**

- **Gerência de estado:** React Context + hooks em `src/state/AppContext.tsx` (`AppProvider` / `useApp()`, sem lib externa). `tasks`, `categories` e filtros ficam em `useState`; `filteredTasks` é derivado com `useMemo` + `filterTasks()`.
- **Atualização da UI:** cada operação grava no SQLite e chama `setTasks()`; a mudança de estado re-renderiza quem usa `useApp()` (ex.: `FlatList` em `TaskListScreen`).
- **Criar:** `TaskEditorScreen` -> `addTask()` -> `insertTask()` + `setTasks([nova, ...prev])` -> `goBack()` mostra a lista atualizada.
- **Editar:** form pré-preenchido via `taskById()` -> `updateTask()` -> `dbUpdateTask()` + `setTasks(map substitui id)` -> `goBack()`.
- **Concluir:** checkbox em `TaskItem.tsx` -> `toggleTask(id)` -> `dbUpdateTask()` + `setTasks(map inverte completed)` -> checkbox e lista atualizam na hora.

---

## 3. Persistência SQLite

Como o SQLite é usado no aplicativo?

Identifique:

**Resposta:**

- **Onde o banco é criado:** `src/db/database.ts` → `getDatabase()` (singleton via `expo-sqlite`, arquivo `todo.db`). Cria tabelas `categories` e `tasks`, ativa `PRAGMA foreign_keys = ON`, cria índices e insere seed (Personal, Work, Study, Shopping).
- **Como são armazenadas:** tabela `categories(id, name UNIQUE, color)`; tabela `tasks(id, title, description, completed 0/1, dueDateTime INTEGER epoch-ms, createdAt, categoryId FK → categories ON DELETE SET NULL, notificationId)`. Conversão linha→objeto em `toTask()`/`toCategory()`.
- **Onde fica o CRUD:** `src/db/taskRepository.ts` (`getAllTasks/insertTask/updateTask/deleteTask/setTaskNotificationId/detachCategoryFromTasks`) e `src/db/categoryRepository.ts` (`getAllCategories/insertCategory/updateCategory/deleteCategory`), chamados pelo `src/state/AppContext.tsx`.

## 4. Acompanhamento de uma Operação

: Rastreie o que acontece quando o usuário cria uma nova tarefa.

Comece pressionando **Salvar** e acompanhe a execução até:

Descreva as principais funções/componentes envolvidos.

**Resposta:**

- **Salvar:** `TaskEditorScreen.tsx` → `handleSave()` monta payload e chama `addTask()` do `AppContext`.
- **1. Armazenada no SQLite:** `addTask()` valida título/data → `taskRepository.ts` → `insertTask()` (`INSERT INTO tasks...`) retorna `Task` com `id`/`createdAt`.
- **2. Aparece na lista:** `setTasks([nova, ...prev])` atualiza o Context → `navigation.goBack()` volta à `TaskListScreen.tsx`, que re-renderiza `filteredTasks` na `FlatList`/`TaskItem.tsx`.
- **3. Notificação (se futura):** `syncReminderForTask(nova)` em `notifications.ts` agenda via `scheduleNotificationAsync` só se pendente + futura + permissão ok; o id retornado é salvo com `setTaskNotificationId()` e no estado. Sem data futura → nada é agendado.

---

## 5. Navegação:

Como funciona a navegação entre as telas?

Em particular:

- como o aplicativo navega da lista de tarefas para o editor de tarefas?
- ao editar uma tarefa, quais informações são passadas entre as telas?

Por exemplo: ID da tarefa, objeto completo, estado compartilhado ou outra abordagem.

**Resposta:**

- **Mecanismo:** native-stack em `App.tsx` (`TaskList` / `TaskEditor` / `Categories`), tipos em `src/navigation/types.ts`.
- **Lista → Editor:** `navigate('TaskEditor', { taskId: id })` ao tocar na tarefa; FAB usa `{ taskId: undefined }` (criar); volta com `goBack()`.
- **Dado passado:** só o `taskId`; o editor lê via `taskById()` do `AppContext` (fonte única).

## 6. Notificações

**Resposta:**

- **Agendamento:** `syncReminderForTask()` em `src/notifications/notifications.ts` via `scheduleNotificationAsync`, só se pendente + futura + permissão ok.
- **Associação:** id opaco salvo em `Task.notificationId` (coluna `tasks.notificationId`) com `setTaskNotificationId()`.
- **Data muda:** cancela o id antigo e reagenda (ou cancela se removida/passada).
- **Concluir/excluir:** `toggleTask()`/`deleteTask()` em `AppContext.tsx` chamam `cancelReminder()` e zeram o campo.

---

## 7. Decisões do Agente:

Identifique pelo menos **duas decisões importantes tomadas pelo agente de codificação que não foram explicitamente especificadas na tarefa**.

Exemplos:

- arquitetura;
- bibliotecas;
- Estratégia de gerenciamento de estado;
- Abordagem de navegação; -
  Abstração do SQLite;
- Estrutura do projeto.

Para cada item, explique a escolha do agente.

**Resposta:**

- **Estado com Context + hooks (`src/state/AppContext.tsx`):** sem Redux/Zustand; suficiente para app pequeno, menos boilerplate, UI atualiza via `setTasks()`/`useMemo`.
- **SQLite direto sem ORM (`src/db/database.ts` + repositórios):** `expo-sqlite` com SQL explícito e singleton; evita codegen, FK `ON DELETE SET NULL` + seed simples.
- **Campos extras (`src/types.ts`):** `Task.notificationId` guarda o id opaco do Expo p/ cancelar exato; `Category.color` p/ ponto colorido na UI.

## 8. Análise do BUILD_LOG

Usando o arquivo `BUILD_LOG.md`, identifique:

- um problema ou bug encontrado durante o desenvolvimento;
- como o agente tentou resolvê-lo;
- se a primeira solução funcionou;
- o que foi feito no final.

**Resposta (Entrada 09 — `BUILD_LOG.md`):**

- **Problema:** crash no Expo Go/Android só ao importar `expo-notifications` (side effect de push lança `throw` na avaliação do módulo).
- **Tentativa:** `import` dinâmico com `try/catch` + detecção de Expo Go via `expo-constants` (`appOwnership === "expo"`); lembretes desativados com aviso na UI, resto do app normal.
- **Primeira solução funcionou:** sim — sem redbox; `tsc` limpo, `jest` 9/9, `expo-doctor` 21/21, `export --platform android` ok.
- **Final:** mantida degradação graciosa (`remindersSupported=false` + banner em `TaskListScreen`); notificações reais via dev build (`npx expo run:android`).

**O que o log de compilação ajudou você a entender que teria sido mais difícil de descobrir olhando apenas para o código final?**

O que mais ajudou foi saber o caminho de cada funcionalidade pelos arquivos.
