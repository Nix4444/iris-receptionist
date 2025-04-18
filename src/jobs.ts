import { prismaClient } from "./prisma";

async function removeAppointments(){
    const appointments = await prismaClient.appointment.deleteMany({
        where:{
            time: {lt: new Date()}
        }
    })
    
    if (appointments.count > 0) {
        console.log(`Deleted ${appointments.count} expired appointment(s)`)
    } else {
        console.log("No expired appointments to delete")
    }
}

setInterval(removeAppointments, 1000 * 60)

removeAppointments()