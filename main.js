const STORAGE_KEY = "expense-tracker-transactions";
const TRANSACTION_UPDATED_EVENT = "transaction:updated";

let transactions = loadTransactions();
let editingTransactionId = null;

const transactionForm = document.getElementById("transactionForm");
const searchTransactionForm = document.getElementById("searchTransactionForm");
const titleInput = document.getElementById("transactionFormTitleInput");
const amountInput = document.getElementById("transactionFormAmountInput");
const dateInput = document.getElementById("transactionFormDateInput");
const typeSelect = document.getElementById("transactionFormTypeSelect");
const submitButton = document.querySelector('[data-testid="transactionFormSubmitButton"]');
const formHeading = document.getElementById("form-heading");
const searchInput = document.getElementById("searchTransactionFormTitleInput");
const incomeList = document.getElementById("incomeList");
const expenseList = document.getElementById("expenseList");
const balanceAmount = document.querySelector(".tracker-summary__balance-amount");
const incomeAmount = document.querySelector(".tracker-summary__stat-amount--income");
const expenseAmount = document.querySelector(".tracker-summary__stat-amount--expense");

document.addEventListener("DOMContentLoaded", () => {
  dateInput.value = getTodayDate();
  document.dispatchEvent(new Event(TRANSACTION_UPDATED_EVENT));
});

document.addEventListener(TRANSACTION_UPDATED_EVENT, () => {
  renderTransactions(getFilteredTransactions(searchInput.value));
  updateDashboard();
  saveTransactions();
});

transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;
  const type = typeSelect.value;

  if (!title) {
    alert("Judul transaksi tidak boleh kosong.");
    return;
  }

  if (amount < 1) {
    alert("Nominal transaksi minimal 1 rupiah.");
    return;
  }

  const transaction = {
    id: editingTransactionId ?? generateTransactionId(),
    title,
    amount,
    date,
    type,
  };

  if (editingTransactionId !== null) {
    transactions = transactions.map((item) =>
      item.id === editingTransactionId ? transaction : item
    );
  } else {
    transactions.push(transaction);
  }

  resetForm();
  document.dispatchEvent(new Event(TRANSACTION_UPDATED_EVENT));
});

searchTransactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderTransactions(getFilteredTransactions(searchInput.value));
});

searchInput.addEventListener("input", () => {
  renderTransactions(getFilteredTransactions(searchInput.value));
});

function loadTransactions() {
  const storedTransactions = localStorage.getItem(STORAGE_KEY);

  if (!storedTransactions) {
    return [];
  }

  try {
    const parsedTransactions = JSON.parse(storedTransactions);
    return Array.isArray(parsedTransactions) ? parsedTransactions : [];
  } catch (error) {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function generateTransactionId() {
  return +new Date();
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getFilteredTransactions(keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return transactions;
  }

  return transactions.filter((transaction) =>
    transaction.title.toLowerCase().includes(normalizedKeyword)
  );
}

function renderTransactions(transactionItems) {
  incomeList.innerHTML = "";
  expenseList.innerHTML = "";

  transactionItems.forEach((transaction) => {
    const card = createTransactionItem(transaction);
    const targetList = transaction.type === "income" ? incomeList : expenseList;

    targetList.appendChild(card);
  });
}

function createTransactionItem(transaction) {
  const card = document.createElement("div");
  card.className = "tracker-transaction-item";
  card.setAttribute("data-testid", "transactionItem");

  const icon = document.createElement("div");
  icon.className = `tracker-transaction-item__icon tracker-transaction-item__icon--${transaction.type}`;
  icon.textContent = transaction.type === "income" ? "+" : "-";

  const detail = document.createElement("div");
  detail.className = "tracker-transaction-item__detail";

  const title = document.createElement("h3");
  title.className = "tracker-transaction-item__title";
  title.setAttribute("data-testid", "transactionItemTitle");
  title.textContent = transaction.title;

  const date = document.createElement("p");
  date.className = "tracker-transaction-item__date";
  date.setAttribute("data-testid", "transactionItemDate");
  date.textContent = `Tanggal: ${transaction.date}`;

  const type = document.createElement("p");
  type.className = "tracker-transaction-item__date";
  type.setAttribute("data-testid", "transactionItemType");
  type.textContent = `Tipe: ${transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}`;

  detail.append(title, date, type);

  const right = document.createElement("div");
  right.className = "tracker-transaction-item__right";

  const amount = document.createElement("p");
  amount.className = `tracker-transaction-item__amount tracker-transaction-item__amount--${transaction.type}`;
  amount.setAttribute("data-testid", "transactionItemAmount");
  amount.textContent = `Nominal: ${formatCurrency(transaction.amount)}`;

  const actions = document.createElement("div");
  actions.className = "tracker-transaction-item__actions";

  const toggleTypeButton = document.createElement("button");
  toggleTypeButton.type = "button";
  toggleTypeButton.className = "tracker-transaction-item__btn";
  toggleTypeButton.setAttribute("data-testid", "transactionItemEditTypeButton");
  toggleTypeButton.textContent = "Ubah Tipe";
  toggleTypeButton.addEventListener("click", () => toggleTransactionType(transaction.id));

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "tracker-transaction-item__btn";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => startEditTransaction(transaction.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "tracker-transaction-item__btn";
  deleteButton.setAttribute("data-testid", "transactionItemDeleteButton");
  deleteButton.textContent = "Hapus";
  deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

  actions.append(toggleTypeButton, editButton, deleteButton);
  right.append(amount, actions);
  card.append(icon, detail, right);

  return card;
}

function updateDashboard() {
  const totals = transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") {
        summary.income += transaction.amount;
      } else {
        summary.expense += transaction.amount;
      }

      return summary;
    },
    { income: 0, expense: 0 }
  );

  balanceAmount.textContent = formatCurrency(totals.income - totals.expense);
  incomeAmount.textContent = formatCurrency(totals.income);
  expenseAmount.textContent = formatCurrency(totals.expense);
}

function deleteTransaction(transactionId) {
  transactions = transactions.filter((transaction) => transaction.id !== transactionId);

  if (editingTransactionId === transactionId) {
    resetForm();
  }

  document.dispatchEvent(new Event(TRANSACTION_UPDATED_EVENT));
}

function startEditTransaction(transactionId) {
  const transaction = transactions.find((item) => item.id === transactionId);

  if (!transaction) {
    return;
  }

  editingTransactionId = transaction.id;
  titleInput.value = transaction.title;
  amountInput.value = transaction.amount;
  dateInput.value = transaction.date;
  typeSelect.value = transaction.type;
  submitButton.textContent = "Perbarui";
  formHeading.textContent = "Edit Pencatatan";
  titleInput.focus();
}

function resetForm() {
  editingTransactionId = null;
  transactionForm.reset();
  dateInput.value = getTodayDate();
  typeSelect.value = "income";
  submitButton.textContent = "Simpan";
  formHeading.textContent = "Tambah Pencatatan Baru";
}

function toggleTransactionType(transactionId) {
  transactions = transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
      return transaction;
    }

    return {
      ...transaction,
      type: transaction.type === "income" ? "expense" : "income",
    };
  });

  if (editingTransactionId === transactionId) {
    const currentType = typeSelect.value;
    typeSelect.value = currentType === "income" ? "expense" : "income";
  }

  document.dispatchEvent(new Event(TRANSACTION_UPDATED_EVENT));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
