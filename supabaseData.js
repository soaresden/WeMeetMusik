/**
 * Supabase Data Manager
 * Toutes les opérations sur Supabase pour partitions et statuts
 */

const SupabaseData = {
    /**
     * Récupérer tous les souhaits de partitions
     */
    async getAllPartitions() {
        try {
            const { data, error } = await supabase
                .from('partitions')
                .select('*, users(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Error fetching partitions:', error);
            return [];
        }
    },

    /**
     * Ajouter une nouvelle partition (souhait)
     */
    async addPartition(title, artist, userId) {
        try {
            console.log(`📝 Adding partition: ${title} - ${artist}`);

            const { data, error } = await supabase
                .from('partitions')
                .insert([{
                    title,
                    artist,
                    user_id: userId,
                    status: 'Partition Manquante'
                }])
                .select();

            if (error) throw error;
            console.log('✅ Partition added');
            return data?.[0];
        } catch (error) {
            console.error('❌ Error adding partition:', error);
            throw error;
        }
    },

    /**
     * Chercher les partitions par titre (autocomplétion)
     */
    async searchPartitions(query) {
        try {
            if (!query || query.length < 2) return [];

            const { data, error } = await supabase
                .from('partitions')
                .select('title')
                .ilike('title', `%${query}%`)
                .limit(5);

            if (error) throw error;
            return data?.map(p => p.title) || [];
        } catch (error) {
            console.error('❌ Error searching partitions:', error);
            return [];
        }
    },

    /**
     * Mettre à jour le statut d'une partition (Manquante / Ok)
     */
    async updatePartitionStatus(partitionId, status) {
        try {
            const { error } = await supabase
                .from('partitions')
                .update({ status })
                .eq('id', partitionId);

            if (error) throw error;
            console.log(`✅ Partition status updated: ${status}`);
        } catch (error) {
            console.error('❌ Error updating partition status:', error);
            throw error;
        }
    },

    /**
     * Ajouter/mettre à jour le statut d'un utilisateur pour une partition
     * status: 'working' (🐫), 'todo' (🤔), 'skilled' (✅)
     */
    async setUserPartitionStatus(userId, partitionId, status) {
        try {
            const { data, error } = await supabase
                .from('user_partition_statuses')
                .upsert([{
                    user_id: userId,
                    partition_id: partitionId,
                    status
                }]);

            if (error) throw error;
            console.log(`✅ User status set: ${status}`);
            return data;
        } catch (error) {
            console.error('❌ Error setting user status:', error);
            throw error;
        }
    },

    /**
     * Supprimer le statut d'un utilisateur pour une partition
     */
    async removeUserPartitionStatus(userId, partitionId) {
        try {
            const { error } = await supabase
                .from('user_partition_statuses')
                .delete()
                .eq('user_id', userId)
                .eq('partition_id', partitionId);

            if (error) throw error;
            console.log('✅ User status removed');
        } catch (error) {
            console.error('❌ Error removing user status:', error);
            throw error;
        }
    },

    /**
     * Récupérer les statuts pour une partition
     */
    async getPartitionStatuses(partitionId) {
        try {
            const { data, error } = await supabase
                .from('user_partition_statuses')
                .select('*, users(name)')
                .eq('partition_id', partitionId);

            if (error) throw error;

            return {
                working: data?.filter(p => p.status === 'working') || [],
                todo: data?.filter(p => p.status === 'todo') || [],
                skilled: data?.filter(p => p.status === 'skilled') || []
            };
        } catch (error) {
            console.error('❌ Error fetching partition statuses:', error);
            return { working: [], todo: [], skilled: [] };
        }
    },

    /**
     * Récupérer le statut d'un utilisateur pour une partition
     */
    async getUserPartitionStatus(userId, partitionId) {
        try {
            const { data, error } = await supabase
                .from('user_partition_statuses')
                .select('status')
                .eq('user_id', userId)
                .eq('partition_id', partitionId)
                .single();

            if (error?.code === 'PGRST116') return null; // Pas trouvé
            if (error) throw error;

            return data?.status || null;
        } catch (error) {
            console.error('❌ Error fetching user status:', error);
            return null;
        }
    },

    /**
     * Supprimer une partition
     */
    async deletePartition(partitionId) {
        try {
            const { error } = await supabase
                .from('partitions')
                .delete()
                .eq('id', partitionId);

            if (error) throw error;
            console.log('✅ Partition deleted');
        } catch (error) {
            console.error('❌ Error deleting partition:', error);
            throw error;
        }
    },

    /**
     * Mettre à jour le nom du fichier
     */
    async updatePartitionField(partitionId, field, value) {
        try {
            const { error } = await supabase
                .from('partitions')
                .update({ [field]: value })
                .eq('id', partitionId);

            if (error) throw error;
            console.log(`✅ Partition ${field} updated: ${value}`);
        } catch (error) {
            console.error(`❌ Error updating ${field}:`, error);
            throw error;
        }
    },

    /**
     * Récupérer les instruments d'un utilisateur
     */
    async getUserInstruments(userId) {
        try {
            const { data, error } = await supabase
                .from('user_instruments')
                .select('instrument')
                .eq('user_id', userId);

            if (error) throw error;
            return data?.map(i => i.instrument) || [];
        } catch (error) {
            console.error('❌ Error fetching instruments:', error);
            return [];
        }
    },

    /**
     * Ajouter un instrument pour un utilisateur
     */
    async addInstrument(userId, instrument) {
        try {
            console.log(`📝 Adding instrument to DB: userId=${userId}, instrument=${instrument}`);
            const { data, error } = await supabase
                .from('user_instruments')
                .insert([{
                    user_id: userId,
                    instrument: instrument.trim()
                }])
                .select();

            if (error) {
                console.error('❌ Supabase error on insert:', error.code, error.message);
                if (error.code === '23505') {
                    throw new Error('Cet instrument existe déjà');
                }
                throw error;
            }

            console.log(`✅ Instrument added successfully to DB:`, data);
        } catch (error) {
            console.error('❌ Error adding instrument:', error.message);
            throw error;
        }
    },

    /**
     * Supprimer un instrument
     */
    async removeInstrument(userId, instrument) {
        try {
            console.log(`🗑️ Removing instrument from DB: userId=${userId}, instrument=${instrument}`);
            const { data, error } = await supabase
                .from('user_instruments')
                .delete()
                .eq('user_id', userId)
                .eq('instrument', instrument)
                .select();

            if (error) {
                console.error('❌ Supabase error on delete:', error.code, error.message);
                throw error;
            }

            console.log(`✅ Instrument removed successfully from DB:`, data);
        } catch (error) {
            console.error('❌ Error removing instrument:', error.message);
            throw error;
        }
    },

    /**
     * Récupérer tous les instruments disponibles
     */
    async getAllAvailableInstruments() {
        try {
            const { data, error } = await supabase
                .from('instruments')
                .select('name')
                .order('name', { ascending: true });

            if (error) throw error;
            return data?.map(i => i.name) || [];
        } catch (error) {
            console.error('❌ Error fetching available instruments:', error);
            return [];
        }
    }
};

console.log('🎵 SupabaseData loaded');
