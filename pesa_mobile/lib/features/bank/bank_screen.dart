import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/bank_account.dart';
import '../home/bootstrap_provider.dart';
import 'bank_account_action_sheet.dart';
import 'bank_account_form_sheet.dart';

class BankScreen extends ConsumerWidget {
  const BankScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(bootstrapProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(bootstrapProvider.future),
        child: bootstrap.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => ListView(
            children: [
              const SizedBox(height: 120),
              Center(child: Text('Could not load data.\n$error', textAlign: TextAlign.center)),
            ],
          ),
          data: (data) {
            final currency = data.profile.currency;
            final accounts = data.bankAccounts;
            return ListView(
              children: [
                if (accounts.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: Text('No accounts yet.')),
                  )
                else
                  for (final account in accounts)
                    _AccountTile(
                      account: account,
                      currency: currency,
                      allAccounts: accounts,
                    ),
                const SizedBox(height: 80),
              ],
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'bank-add-account-fab',
        onPressed: () => showCreateBankAccountSheet(context),
        tooltip: 'Add account',
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AccountTile extends StatelessWidget {
  const _AccountTile({required this.account, required this.currency, required this.allAccounts});

  final BankAccount account;
  final String currency;
  final List<BankAccount> allAccounts;

  @override
  Widget build(BuildContext context) {
    final format = NumberFormat.decimalPattern();
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: ListTile(
        title: Text(account.name),
        subtitle: account.isPrimary ? const Text('Primary') : null,
        trailing: Text(
          '$currency${format.format(account.balance)}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        onTap: () => showBankAccountActionSheet(
          context: context,
          account: account,
          allAccounts: allAccounts,
        ),
      ),
    );
  }
}
