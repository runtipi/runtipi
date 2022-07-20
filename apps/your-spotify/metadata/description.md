## Your Spotify

YourSpotify is a self-hosted application that tracks what you listen and offers you a dashboard to explore statistics about it! It's composed of a web server which polls the Spotify API every now and then and a web application on which you can explore your statistics.

![Screenshots](https://user-images.githubusercontent.com/17204739/154752226-c2215a51-e20e-4ade-ac63-42c5abb25240.png)

### Creating the Spotify Application

For **YourSpotify** to work you need to provide a Spotify application **public** AND **secret** to the server environment.
To do so, you need to create a **Spotify application** [here](https://developer.spotify.com/dashboard/applications).

1. Click on **Create a client ID**.
2. Fill out all the informations.
3. Copy the **public** and the **secret** key respectively.
4. Add an authorized redirect URI corresponding to your **server** location on the internet adding the suffix **/oauth/spotify/callback**.
   1. use the `EDIT SETTINGS` button on the top right corner of the page.
   2. add your URI under the `Redirect URIs` section.
   - i.e: `http://localhost:8080/oauth/spotify/callback` or `http://home.mydomain.com/your_spotify_backend/oauth/spotify/callback`
   3. Do not forget to hit the save button at the bottom of the popup.
