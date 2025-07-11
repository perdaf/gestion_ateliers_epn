import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#112233',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#112233',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: '#F0F0F0',
    padding: 5,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderStyle: 'solid',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    borderBottomStyle: 'solid',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#EEEEEE',
  },
  tableCell: {
    padding: 5,
    fontSize: 10,
  },
  titleCell: {
    width: '25%',
  },
  dateCell: {
    width: '20%',
  },
  timeCell: {
    width: '12%',
  },
  atelierCell: {
    width: '35%',
  },
  animateursCell: {
    width: '14%',
  },
  porteurCell: {
    width: '14%',
  },
  atelierItem: {
    marginBottom: 3,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    borderBottomStyle: 'solid',
  },
  atelierTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  atelierDescription: {
    fontSize: 8,
    color: '#555555',
    fontStyle: 'italic',
  },
  multipleAteliers: {
    flexDirection: 'column',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    textAlign: 'center',
    color: '#666666',
  },
});

// Helper function to format date and time
const formatDateTime = (date: Date) => {
  return format(date, 'dd MMMM yyyy', { locale: fr });
};

const formatTime = (date: Date) => {
  return format(date, 'HH:mm', { locale: fr });
};

// Group events by date
const groupEventsByDate = (events: any[]) => {
  const grouped: Record<string, any[]> = {};
  
  events.forEach(event => {
    const dateKey = formatDateTime(new Date(event.date_debut));
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });
  
  return Object.entries(grouped).sort(([dateA], [dateB]) => {
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
};

// Main component
interface CalendarPDFProps {
  evenements: any[];
  startDate?: Date;
  endDate?: Date;
}

export const CalendarPDF: React.FC<CalendarPDFProps> = ({ 
  evenements, 
  startDate = new Date(), 
  endDate = new Date() 
}) => {
  const groupedEvents = groupEventsByDate(evenements);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Planning des Ateliers EPN</Text>
          <Text style={styles.subtitle}>
            Période : {formatDateTime(startDate)} - {formatDateTime(endDate)}
          </Text>
          <Text style={styles.subtitle}>
            Généré le : {formatDateTime(new Date())}
          </Text>
        </View>
        
        {groupedEvents.map(([date, events]) => (
          <View key={date} style={styles.section}>
            <Text style={styles.sectionTitle}>{date}</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.titleCell]}>Titre</Text>
                <Text style={[styles.tableCell, styles.timeCell]}>Horaire</Text>
                <Text style={[styles.tableCell, styles.atelierCell]}>Ateliers & Descriptions</Text>
                <Text style={[styles.tableCell, styles.porteurCell]}>Porteur</Text>
                <Text style={[styles.tableCell, styles.animateursCell]}>Animateurs</Text>
              </View>
              
              {events.map((event) => (
                <View key={event.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.titleCell]}>{event.titre}</Text>
                  <Text style={[styles.tableCell, styles.timeCell]}>
                    {formatTime(new Date(event.date_debut))} - {formatTime(new Date(event.date_fin))}
                  </Text>
                  <View style={[styles.tableCell, styles.atelierCell]}>
                    {event.ateliers && event.ateliers.length > 0 ? (
                      <View style={styles.multipleAteliers}>
                        {event.ateliers.map((atelierRel: any, index: number) => (
                          <View key={index} style={[
                            styles.atelierItem,
                            index === event.ateliers.length - 1 ? { borderBottomWidth: 0 } : {}
                          ]}>
                            <Text style={styles.atelierTitle}>
                              {atelierRel.atelier.titre}
                            </Text>
                            {atelierRel.atelier.description && (
                              <Text style={styles.atelierDescription}>
                                {atelierRel.atelier.description}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.atelierTitle}>Aucun atelier</Text>
                    )}
                  </View>
                  <Text style={[styles.tableCell, styles.porteurCell]}>
                    {event.porteurProjet.prenom} {event.porteurProjet.nom}
                  </Text>
                  <Text style={[styles.tableCell, styles.animateursCell]}>
                    {event.animateurs.map((a: any) => `${a.agent.prenom} ${a.agent.nom}`).join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.footer}>
          <Text>Espace Public Numérique - Planning des Ateliers</Text>
        </View>
      </Page>
    </Document>
  );
};