export type Id = string

export interface TodoList {
	id: Id
	name: string
	items: TodoItem[]
}

export interface TodoListBasicInfo {
	id: Id
	name: string
	count: number
}

export interface TodoItem {
	id: string
	description: string
	completed: boolean
	priority: 1 | 2 | 3	
}

export async function getLists(): Promise<TodoListBasicInfo[]> {
  return (await fetch("/api/lists")).json()
}

export async function getList(listId: Id): Promise<TodoList | null> {
  return (await fetch(`/api/list/${encodeURIComponent(listId)}/items`)).json()
}

export async function addList(name: string): Promise<Id> {
  return (await (await fetch(
    `/api/new-list`, 
    { 
      method: "POST",
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ name }), 
    }
  )).json()).listId
}

export async function addItemToList(listId: Id, item: Omit<TodoItem, "id">): Promise<Id | null> {
  return (await (await fetch(
    `/api/list/${encodeURIComponent(listId)}/new-item`, 
    { 
      method: "POST",
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(item), 
    }
  )).json()).itemId
}

export async function updateItemOnList(listId: Id, itemId: Id, update: Partial<TodoItem>): Promise<number> {
  return (await (await fetch(
    `/api/list/${encodeURIComponent(listId)}/item/${encodeURIComponent(itemId)}`, 
    { 
      method: "PUT",
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify(update), 
    }
  )).json()).updatedCount
}

export async function deleteList(listId: Id): Promise<void> {
  await fetch(
    `/api/list/${encodeURIComponent(listId)}`, 
    { method: "DELETE" }
  )
}

export async function deleteItemOnList(listId: Id, itemId: Id): Promise<void> {
  await fetch(
    `/api/list/${encodeURIComponent(listId)}/item/${encodeURIComponent(itemId)}`, 
    { method: "DELETE" }
  )
}
