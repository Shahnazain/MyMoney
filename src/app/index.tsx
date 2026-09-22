import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Category = {
  name: string;
  icon: string;
};

type Transaction = {
  id: number;
  type: "income" | "expense";
  amount: number;
  category?: string;
  note: string;
  date: string;
};

const defaultCategories: Category[] = [
  { name: "Food", icon: "🍔" },
  { name: "Transport", icon: "🚌" },
  { name: "Makeup", icon: "💄" },
  { name: "Clothes", icon: "👗" },
  { name: "Skincare", icon: "🧴" },
  { name: "Shopping", icon: "🛍️" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Education", icon: "📚" },
  { name: "Bills", icon: "🏠" },
  { name: "Health", icon: "💊" },
  { name: "Travel", icon: "✈️" },
  { name: "Other", icon: "📦" },
];

export default function HomeScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);

  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [addMoneyModalVisible, setAddMoneyModalVisible] = useState(false);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Food");

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  // =========================
  // LOAD DATA
  // =========================

  const loadData = async () => {
    try {
      const savedBalance = await AsyncStorage.getItem("balance");
      const savedTransactions = await AsyncStorage.getItem("transactions");
      const savedCategories = await AsyncStorage.getItem("categories");

      if (savedBalance) {
        setBalance(Number(savedBalance));
      }

      if (savedTransactions) {
        setTransactions(JSON.parse(savedTransactions));
      }

      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }
    } catch (error) {
      console.log("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // ADD / EDIT MONEY
  // =========================

  const addMoney = async () => {
    const value = Number(amount);

    if (!value || value <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    let newBalance = balance;
    let updatedTransactions = [...transactions];

    if (editingTransaction) {
      const oldAmount = editingTransaction.amount;

      newBalance = balance - oldAmount + value;

      updatedTransactions = transactions.map((transaction) =>
        transaction.id === editingTransaction.id
          ? {
              ...transaction,
              amount: value,
              note: note.trim(),
            }
          : transaction,
      );
    } else {
      newBalance = balance + value;

      const transaction: Transaction = {
        id: Date.now(),
        type: "income",
        amount: value,
        note: note.trim(),
        date: new Date().toISOString(),
      };

      updatedTransactions.push(transaction);
    }

    try {
      await AsyncStorage.setItem("balance", newBalance.toString());

      await AsyncStorage.setItem(
        "transactions",
        JSON.stringify(updatedTransactions),
      );

      setBalance(newBalance);
      setTransactions(updatedTransactions);

      setAmount("");
      setNote("");
      setEditingTransaction(null);
      setAddMoneyModalVisible(false);

      Alert.alert(
        editingTransaction ? "Money received updated" : "Money added",
      );
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // ADD / EDIT EXPENSE
  // =========================

  const addExpense = async () => {
    const value = Number(amount);

    if (!value || value <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    // Normal new expense
    if (!editingTransaction && value > balance) {
      Alert.alert(
        "Not enough money",
        "This expense is greater than your current balance.",
      );
      return;
    }

    // Editing an existing expense
    if (
      editingTransaction &&
      editingTransaction.type === "expense" &&
      value > balance + editingTransaction.amount
    ) {
      Alert.alert(
        "Not enough money",
        "This expense is greater than your available balance.",
      );
      return;
    }

    let newBalance = balance;
    let updatedTransactions = [...transactions];

    if (editingTransaction) {
      const oldAmount = editingTransaction.amount;

      if (editingTransaction.type === "expense") {
        newBalance = balance + oldAmount - value;
      } else {
        // This should not normally happen because income opens
        // the Add Money modal, but this keeps the logic safe.
        newBalance = balance - oldAmount - value;
      }

      updatedTransactions = transactions.map((transaction) =>
        transaction.id === editingTransaction.id
          ? {
              ...transaction,
              amount: value,
              category: selectedCategory,
              note: note.trim(),
            }
          : transaction,
      );
    } else {
      newBalance = balance - value;

      const transaction: Transaction = {
        id: Date.now(),
        type: "expense",
        amount: value,
        category: selectedCategory,
        note: note.trim(),
        date: new Date().toISOString(),
      };

      updatedTransactions.push(transaction);
    }

    try {
      await AsyncStorage.setItem("balance", newBalance.toString());

      await AsyncStorage.setItem(
        "transactions",
        JSON.stringify(updatedTransactions),
      );

      setBalance(newBalance);
      setTransactions(updatedTransactions);

      setAmount("");
      setNote("");
      setSelectedCategory("Food");
      setEditingTransaction(null);
      setExpenseModalVisible(false);

      Alert.alert(editingTransaction ? "Expense updated" : "Expense added");
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // ADD CATEGORY
  // =========================

  const addCategory = () => {
    Alert.prompt(
      "Add Category",
      "Enter your new category name",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add",
          onPress: async (categoryName: string | undefined) => {
            const name = categoryName?.trim();

            if (!name) {
              return;
            }

            const alreadyExists = categories.some(
              (category) => category.name.toLowerCase() === name.toLowerCase(),
            );

            if (alreadyExists) {
              Alert.alert("Already exists", "This category already exists.");
              return;
            }

            const newCategory: Category = {
              name,
              icon: "📌",
            };

            const updatedCategories = [...categories, newCategory];

            try {
              await AsyncStorage.setItem(
                "categories",
                JSON.stringify(updatedCategories),
              );

              setCategories(updatedCategories);
              setSelectedCategory(name);
            } catch (error) {
              Alert.alert("Error", "Could not save the category.");

              console.log(error);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  // =========================
  // DELETE TRANSACTION
  // =========================

  const deleteTransaction = async (id: number) => {
    const transaction = transactions.find((item) => item.id === id);

    if (!transaction) {
      return;
    }

    Alert.alert(
      "Delete transaction?",
      "This will also update your balance and analytics.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedTransactions = transactions.filter(
              (item) => item.id !== id,
            );

            const newBalance =
              transaction.type === "expense"
                ? balance + transaction.amount
                : balance - transaction.amount;

            try {
              await AsyncStorage.setItem(
                "transactions",
                JSON.stringify(updatedTransactions),
              );

              await AsyncStorage.setItem("balance", newBalance.toString());

              setTransactions(updatedTransactions);
              setBalance(newBalance);
            } catch (error) {
              console.log(error);
            }
          },
        },
      ],
    );
  };

  // =========================
  // START EDITING
  // =========================

  const startEditing = (transaction: Transaction) => {
    setEditingTransaction(transaction);

    setAmount(transaction.amount.toString());
    setNote(transaction.note);

    if (transaction.category) {
      setSelectedCategory(transaction.category);
    }

    if (transaction.type === "expense") {
      setExpenseModalVisible(true);
    } else {
      setAddMoneyModalVisible(true);
    }
  };

  // =========================
  // ANALYTICS
  // =========================

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthExpenses = transactions.filter((transaction) => {
    if (transaction.type !== "expense") {
      return false;
    }

    const date = new Date(transaction.date);

    return (
      date.getMonth() === currentMonth && date.getFullYear() === currentYear
    );
  });

  const totalExpenses = thisMonthExpenses.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const totalAllTimeExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const categoryTotals = categories
    .map((category) => {
      const total = thisMonthExpenses
        .filter((transaction) => transaction.category === category.name)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        ...category,
        total,
      };
    })
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total);

  const highestCategory = categoryTotals[0];

  // =========================
  // HOME SCREEN
  // =========================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.containerContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>My Money 💰</Text>

      <Text style={styles.label}>Current Balance</Text>

      <Text style={styles.balance}>₹{balance.toFixed(2)}</Text>

      {/* =========================
          MAIN BUTTONS
      ========================= */}

      <View style={styles.buttons}>
        {/* ADD MONEY */}

        <Pressable
          style={styles.addMoneyButton}
          onPress={() => {
            setEditingTransaction(null);
            setAmount("");
            setNote("");
            setAddMoneyModalVisible(true);
          }}
        >
          <Text style={styles.addMoneyText}>＋ Add Money</Text>
        </Pressable>

        {/* ADD EXPENSE */}

        <Pressable
          style={styles.expenseButton}
          onPress={() => {
            setEditingTransaction(null);
            setAmount("");
            setNote("");
            setSelectedCategory("Food");
            setExpenseModalVisible(true);
          }}
        >
          <Text style={styles.expenseText}>− Add Expense</Text>
        </Pressable>
      </View>

      {/* =========================
          RECENT TRANSACTIONS
      ========================= */}

      <View style={styles.transactionSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>

        {transactions.length === 0 ? (
          <View style={styles.emptyTransactions}>
            <Text style={styles.emptyText}>No transactions yet</Text>

            <Text style={styles.emptySubtext}>
              Your expenses and money received will appear here.
            </Text>
          </View>
        ) : (
          [...transactions]
            .reverse()
            .slice(0, 5)
            .map((transaction) => {
              const category = categories.find(
                (item) => item.name === transaction.category,
              );

              const isIncome = transaction.type === "income";

              return (
                <View key={transaction.id} style={styles.transactionCard}>
                  {/* LEFT SIDE */}

                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIcon}>
                      <Text style={styles.transactionEmoji}>
                        {isIncome ? "💰" : category?.icon || "📦"}
                      </Text>
                    </View>

                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>
                        {isIncome
                          ? transaction.note || "Money received"
                          : transaction.category}
                      </Text>

                      <Text style={styles.transactionNote}>
                        {!isIncome && transaction.note
                          ? transaction.note
                          : new Date(transaction.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {/* EDIT + DELETE */}

                  <View style={styles.transactionActions}>
                    <Pressable onPress={() => startEditing(transaction)}>
                      <Text style={styles.actionIcon}>✏️</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => deleteTransaction(transaction.id)}
                    >
                      <Text style={styles.actionIcon}>🗑️</Text>
                    </Pressable>
                  </View>

                  {/* AMOUNT */}

                  <Text
                    style={[
                      styles.transactionAmount,
                      isIncome ? styles.incomeAmount : styles.expenseAmount,
                    ]}
                  >
                    {isIncome ? "+" : "−"}₹{transaction.amount.toFixed(2)}
                  </Text>
                </View>
              );
            })
        )}
      </View>

      {/* =========================
          ANALYTICS
      ========================= */}

      <View style={styles.analyticsSection}>
        <View style={styles.analyticsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Spending Analytics</Text>

            <Text style={styles.analyticsSubtitle}>This month</Text>
          </View>
        </View>

        {/* TOTAL EXPENSE */}

        <View style={styles.totalExpenseCard}>
          <Text style={styles.totalExpenseLabel}>Total spent</Text>

          <Text style={styles.totalExpenseAmount}>
            ₹{totalAllTimeExpenses.toFixed(2)}
          </Text>

          <Text style={styles.analyticsSubtitleWhite}>
            This month: ₹{totalExpenses.toFixed(2)}
          </Text>

          {highestCategory ? (
            <Text style={styles.highestCategoryText}>
              Highest: {highestCategory.icon} {highestCategory.name}
            </Text>
          ) : (
            <Text style={styles.highestCategoryText}>
              No expenses this month
            </Text>
          )}
        </View>

        {/* CATEGORY REPORT */}

        {categoryTotals.length === 0 ? (
          <View style={styles.emptyAnalytics}>
            <Text style={styles.emptyAnalyticsIcon}>📊</Text>

            <Text style={styles.emptyText}>No spending data yet</Text>

            <Text style={styles.emptySubtext}>
              Add some expenses to see where your money goes.
            </Text>
          </View>
        ) : (
          <View style={styles.categoryReport}>
            {categoryTotals.map((category) => {
              const percentage =
                totalExpenses > 0 ? (category.total / totalExpenses) * 100 : 0;

              return (
                <View key={category.name} style={styles.reportRow}>
                  <View style={styles.reportTop}>
                    <View style={styles.reportCategory}>
                      <Text style={styles.reportIcon}>{category.icon}</Text>

                      <Text style={styles.reportName}>{category.name}</Text>
                    </View>

                    <View style={styles.reportAmountContainer}>
                      <Text style={styles.reportAmount}>
                        ₹{category.total.toFixed(2)}
                      </Text>

                      <Text style={styles.reportPercentage}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBackground}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${percentage}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* =========================
          ADD / EDIT MONEY MODAL
      ========================= */}

      <Modal
        visible={addMoneyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setEditingTransaction(null);
          setAddMoneyModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackground}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingTransaction ? "Edit Money Received" : "Add Money"}
            </Text>

            <Text style={styles.inputLabel}>Amount</Text>

            <TextInput
              style={styles.input}
              placeholder="₹ 0"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.inputLabel}>Note (optional)</Text>

            <TextInput
              style={styles.input}
              placeholder="Where did you receive it from?"
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setAmount("");
                  setNote("");
                  setEditingTransaction(null);
                  setAddMoneyModalVisible(false);
                }}
              >
                <Text>Cancel</Text>
              </Pressable>

              <Pressable style={styles.saveButton} onPress={addMoney}>
                <Text style={styles.saveText}>
                  {editingTransaction ? "Save Changes" : "Add Money"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =========================
          ADD / EDIT EXPENSE MODAL
      ========================= */}

      <Modal
        visible={expenseModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setEditingTransaction(null);
          setExpenseModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackground}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>
                {editingTransaction ? "Edit Expense" : "Add Expense"}
              </Text>

              <Text style={styles.inputLabel}>Amount</Text>

              <TextInput
                style={styles.input}
                placeholder="₹ 0"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.inputLabel}>Category</Text>

              <View style={styles.categoryGrid}>
                {categories.map((category) => (
                  <Pressable
                    key={category.name}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.name &&
                        styles.selectedCategory,
                    ]}
                    onPress={() => setSelectedCategory(category.name)}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>

                    <Text style={styles.categoryName}>{category.name}</Text>
                  </Pressable>
                ))}

                {/* ADD CATEGORY */}

                <Pressable style={styles.categoryButton} onPress={addCategory}>
                  <Text style={styles.categoryIcon}>＋</Text>

                  <Text style={styles.categoryName}>Add Category</Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Note (optional)</Text>

              <TextInput
                style={styles.input}
                placeholder="What did you buy?"
                value={note}
                onChangeText={setNote}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setAmount("");
                    setNote("");
                    setSelectedCategory("Food");
                    setEditingTransaction(null);
                    setExpenseModalVisible(false);
                  }}
                >
                  <Text>Cancel</Text>
                </Pressable>

                <Pressable style={styles.saveButton} onPress={addExpense}>
                  <Text style={styles.saveText}>
                    {editingTransaction ? "Save Changes" : "Add Expense"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  containerContent: {
    padding: 24,
    paddingTop: 100,
    paddingBottom: 50,
  },

  analyticsSubtitleWhite: {
    color: "#AEB2BC",
    fontSize: 13,
    marginTop: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#15171C",
    marginBottom: 50,
  },

  label: {
    fontSize: 15,
    color: "#737782",
    marginBottom: 8,
  },

  balance: {
    fontSize: 42,
    fontWeight: "700",
    color: "#15171C",
    marginBottom: 40,
  },

  buttons: {
    gap: 12,
  },

  addMoneyButton: {
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  addMoneyText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },

  expenseButton: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7E8ED",
  },

  expenseText: {
    color: "#15171C",
    fontSize: 17,
    fontWeight: "600",
  },

  // =========================
  // TRANSACTIONS
  // =========================

  transactionSection: {
    marginTop: 35,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#15171C",
    marginBottom: 14,
  },

  emptyTransactions: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7E8ED",
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#15171C",
  },

  emptySubtext: {
    fontSize: 13,
    color: "#737782",
    marginTop: 5,
    textAlign: "center",
  },

  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7E8ED",
  },

  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  transactionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#F1F2F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  transactionEmoji: {
    fontSize: 22,
  },

  transactionInfo: {
    flex: 1,
  },

  transactionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#15171C",
  },

  transactionNote: {
    fontSize: 12,
    color: "#737782",
    marginTop: 3,
  },

  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },

  transactionActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 4,
  },

  actionIcon: {
    fontSize: 16,
    padding: 4,
  },

  incomeAmount: {
    color: "#16845B",
  },

  expenseAmount: {
    color: "#D94B4B",
  },

  // =========================
  // ANALYTICS
  // =========================

  analyticsSection: {
    marginTop: 30,
  },

  analyticsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  analyticsSubtitle: {
    fontSize: 13,
    color: "#737782",
    marginTop: 2,
  },

  totalExpenseCard: {
    backgroundColor: "#111827",
    borderRadius: 22,
    padding: 20,
    marginTop: 14,
    marginBottom: 12,
  },

  totalExpenseLabel: {
    color: "#AEB2BC",
    fontSize: 14,
  },

  totalExpenseAmount: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 5,
  },

  highestCategoryText: {
    color: "#D6D8DE",
    fontSize: 13,
    marginTop: 8,
  },

  categoryReport: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E8ED",
  },

  reportRow: {
    marginBottom: 18,
  },

  reportTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  reportCategory: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  reportIcon: {
    fontSize: 20,
    marginRight: 9,
  },

  reportName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15171C",
  },

  reportAmountContainer: {
    alignItems: "flex-end",
  },

  reportAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15171C",
  },

  reportPercentage: {
    fontSize: 11,
    color: "#737782",
    marginTop: 2,
  },

  progressBackground: {
    height: 8,
    backgroundColor: "#ECEEF2",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressBar: {
    height: 8,
    backgroundColor: "#111827",
    borderRadius: 10,
  },

  emptyAnalytics: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7E8ED",
  },

  emptyAnalyticsIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  // =========================
  // MODALS
  // =========================

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 28,
    maxHeight: "90%",
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 14,
    color: "#737782",
    marginBottom: 8,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E7E8ED",
    borderRadius: 14,
    padding: 15,
    fontSize: 17,
    backgroundColor: "#FFFFFF",
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryButton: {
    width: "30%",
    minHeight: 70,
    borderWidth: 1,
    borderColor: "#E7E8ED",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },

  selectedCategory: {
    borderWidth: 2,
    borderColor: "#111827",
    backgroundColor: "#F1F2F5",
  },

  categoryIcon: {
    fontSize: 23,
    marginBottom: 3,
  },

  categoryName: {
    fontSize: 11,
    textAlign: "center",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F1F2F5",
  },

  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#111827",
  },

  saveText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
