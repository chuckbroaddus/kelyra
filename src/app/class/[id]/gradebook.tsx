import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatCell, gradeCell, loadGradebook, type Gradebook } from '@/lib/gradebook/api';
import { exportGradebookCsv } from '@/lib/gradebook/csv';
import { useFocusEffect } from 'expo-router';

export default function GradebookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Gradebook | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void loadGradebook(id)
        .then(setBook)
        .catch((err) => {
          setStatus(err instanceof Error ? err.message : 'Could not load grade book');
        });
    }, [id]),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Grade book</Text>
      <Text style={styles.body}>Teacher only. Approved work and assigned practice. No weights.</Text>
      <Link href={`/class/${id}`}>
        <Text style={styles.linkText}>Back to class</Text>
      </Link>
      {book && book.assignments.length > 0 ? (
        <Pressable
          onPress={() => {
            void exportGradebookCsv(book, 'class')
              .then(() => setExportMessage('Exported.'))
              .catch((err) => {
                setStatus(err instanceof Error ? err.message : 'Could not export');
              });
          }}
        >
          <Text style={styles.linkText}>Export CSV</Text>
        </Pressable>
      ) : null}
      {exportMessage ? <Text style={styles.meta}>{exportMessage}</Text> : null}
      {!book ? (
        <Text style={styles.meta}>{status ?? 'Loading…'}</Text>
      ) : book.assignments.length === 0 ? (
        <Text style={styles.meta}>No columns yet. Approve work or assign practice.</Text>
      ) : (
        <ScrollView horizontal>
          <View>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.head, styles.name]}>Student</Text>
              {book.assignments.map((assignment) => (
                <Text key={assignment.id} style={[styles.cell, styles.head]}>
                  {assignment.title}
                </Text>
              ))}
            </View>
            {book.students.map((student) => (
              <View key={student.id} style={styles.row}>
                <Text style={[styles.cell, styles.name]}>{student.display_name}</Text>
                {book.assignments.map((assignment) => (
                  <Text key={assignment.id} style={styles.cell}>
                    {formatCell(gradeCell(book, assignment.id, student.id))}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {status ? <Text style={styles.error}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.75,
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 140,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 13,
  },
  head: {
    fontWeight: '700',
    backgroundColor: '#f3f4f6',
  },
  name: {
    width: 120,
  },
  error: {
    color: '#9b1c1c',
  },
});
