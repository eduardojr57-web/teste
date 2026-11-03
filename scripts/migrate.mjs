import {openDb} from '../server/db.mjs';
const db=await openDb();try{console.log('Migrações verificadas com sucesso.')}finally{await db.close()}
